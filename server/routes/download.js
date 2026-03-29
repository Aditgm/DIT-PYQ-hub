import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { buildWatermarkText, validateCloudinaryConfig } from '../services/cloudinary.js';

const router = express.Router();

const WATERMARK_FONT_SIZE = 9;

const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function sanitizeFilename(name) {
  return (name || 'download')
    .replace(/[^a-z0-9\-_. ]/gi, '')
    .trim()
    .replace(/\s+/g, '_');
}

function getExtensionFromUrl(url) {
  if (!url) return 'pdf';
  const pathWithoutQuery = url.split('?')[0];
  const ext = pathWithoutQuery.split('.').pop();
  if (!ext || ext.length > 8) return 'pdf';
  return ext.toLowerCase();
}

async function addPdfFooterWatermark(pdfBuffer, watermarkText) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width } = page.getSize();
    const textWidth = font.widthOfTextAtSize(watermarkText, WATERMARK_FONT_SIZE);
    const x = Math.max(24, (width - textWidth) / 2);
    const y = 18;

    page.drawText(watermarkText, {
      x,
      y,
      size: WATERMARK_FONT_SIZE,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  return Buffer.from(await pdfDoc.save());
}

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function nextDocxRelationshipId(relsXml) {
  const matches = [...relsXml.matchAll(/Id="rId(\d+)"/g)];
  const maxId = matches.reduce((max, match) => Math.max(max, Number(match[1] || 0)), 0);
  return `rId${maxId + 1}`;
}

function upsertDocxFooterReference(documentXml, relId) {
  let replacedAny = false;
  const updated = documentXml.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g, (sectPr) => {
    replacedAny = true;
    if (sectPr.includes('w:footerReference')) {
      if (sectPr.includes('w:type="default"')) {
        return sectPr.replace(/<w:footerReference\b[^>]*w:type="default"[^>]*\/>/, `<w:footerReference w:type="default" r:id="${relId}"/>`);
      }
      return sectPr.replace('</w:sectPr>', `<w:footerReference w:type="default" r:id="${relId}"/></w:sectPr>`);
    }
    return sectPr.replace('</w:sectPr>', `<w:footerReference w:type="default" r:id="${relId}"/></w:sectPr>`);
  });

  if (replacedAny) {
    return updated;
  }

  return documentXml.replace('</w:body>', `<w:sectPr><w:footerReference w:type="default" r:id="${relId}"/></w:sectPr></w:body>`);
}

async function addDocxFooterWatermark(docxBuffer, watermarkText) {
  const zip = await JSZip.loadAsync(docxBuffer);

  const documentFile = zip.file('word/document.xml');
  const relsFile = zip.file('word/_rels/document.xml.rels');
  const contentTypesFile = zip.file('[Content_Types].xml');

  if (!documentFile || !relsFile || !contentTypesFile) {
    throw new Error('Invalid DOCX structure');
  }

  const [documentXml, relsXml, contentTypesXml] = await Promise.all([
    documentFile.async('string'),
    relsFile.async('string'),
    contentTypesFile.async('string'),
  ]);

  const relId = nextDocxRelationshipId(relsXml);
  let footerName = 'footer_watermark.xml';
  let footerTarget = footerName;
  let counter = 1;
  while (zip.file(`word/${footerName}`)) {
    counter += 1;
    footerName = `footer_watermark_${counter}.xml`;
    footerTarget = footerName;
  }

  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:sz w:val="16"/>
        <w:color w:val="7F7F7F"/>
      </w:rPr>
      <w:t>${escapeXml(watermarkText)}</w:t>
    </w:r>
  </w:p>
</w:ftr>`;

  const newRelationship = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="${footerTarget}"/>`;
  const updatedRelsXml = relsXml.replace('</Relationships>', `${newRelationship}</Relationships>`);

  const updatedDocumentXml = upsertDocxFooterReference(documentXml, relId);

  let updatedContentTypesXml = contentTypesXml;
  const overrideTarget = `/word/${footerName}`;
  if (!updatedContentTypesXml.includes(overrideTarget)) {
    const override = `<Override PartName="${overrideTarget}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`;
    updatedContentTypesXml = updatedContentTypesXml.replace('</Types>', `${override}</Types>`);
  }

  zip.file('word/document.xml', updatedDocumentXml);
  zip.file('word/_rels/document.xml.rels', updatedRelsXml);
  zip.file('[Content_Types].xml', updatedContentTypesXml);
  zip.file(`word/${footerName}`, footerXml);

  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

const RATE_LIMIT_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours
const RATE_LIMIT_MAX_DOWNLOADS = 5;

const downloadRateLimitMap = new Map();

export function resetDownloadRateLimitForTests() {
  downloadRateLimitMap.clear();
}

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of downloadRateLimitMap.entries()) {
    if (data.windowStart < now - RATE_LIMIT_WINDOW_MS) {
      downloadRateLimitMap.delete(key);
    }
  }
}

function checkRateLimit(userId) {
  const now = Date.now();
  const key = userId;
  
  let userData = downloadRateLimitMap.get(key);
  
  if (!userData || userData.windowStart < now - RATE_LIMIT_WINDOW_MS) {
    userData = {
      windowStart: now,
      count: 0
    };
    downloadRateLimitMap.set(key, userData);
  }
  
  cleanupExpiredEntries();
  
  if (userData.count >= RATE_LIMIT_MAX_DOWNLOADS) {
    const nextAvailableTime = new Date(userData.windowStart + RATE_LIMIT_WINDOW_MS).toISOString();
    return { allowed: false, nextAvailableTime };
  }
  
  return { allowed: true };
}

function recordDownload(userId) {
  const now = Date.now();
  const key = userId;
  
  let userData = downloadRateLimitMap.get(key);
  
  if (!userData || userData.windowStart < now - RATE_LIMIT_WINDOW_MS) {
    userData = {
      windowStart: now,
      count: 1
    };
  } else {
    userData.count += 1;
  }
  
  downloadRateLimitMap.set(key, userData);
}

router.post('/initiate', async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    const authToken = getBearerToken(req);
    const { paperId } = req.body;

    if (!authToken) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header. Bearer token required.' });
    }

    if (!paperId) {
      return res.status(400).json({ error: 'Missing paperId' });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    const user = authData.user;

    const rateLimitCheck = checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Download credits exhausted.',
        nextAvailableTime: rateLimitCheck.nextAvailableTime,
        retryAfter: Math.ceil((new Date(rateLimitCheck.nextAvailableTime).getTime() - Date.now()) / 1000)
      });
    }

    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title, file_url, status')
      .eq('id', paperId)
      .single();

    if (paperError || !paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    if (paper.status !== 'approved') {
      return res.status(403).json({ error: 'Paper is not available for download' });
    }

    const sourceFormat = getExtensionFromUrl(paper.file_url);

    const token = crypto.randomBytes(32).toString('hex');

    let expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    });

    const { data: tokenRecord, error: tokenError } = await userClient
      .from('download_tokens')
      .insert({
        token,
        paper_id: paperId,
        user_id: user.id,
        expires_at: expiresAt,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Failed to create download token:', tokenError);
      return res.status(500).json({ error: 'Failed to create secure download token' });
    }

    expiresAt = tokenRecord.expires_at;

    const { error: downloadInsertError } = await userClient.from('downloads').insert({
      paper_id: paperId,
      user_id: user.id,
    });

    if (downloadInsertError) {
      console.warn('Failed to record download:', downloadInsertError);
    }

    recordDownload(user.id);

    const publicBaseUrl = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;

    res.json({
      downloadUrl: `${publicBaseUrl}/api/download/file/${token}`,
      token,
      expiresAt,
      filename: `${paper.title.replace(/[^a-z0-9]/gi, '_')}${sourceFormat === 'pdf' || sourceFormat === 'docx' ? '_watermarked' : ''}.${sourceFormat}`
    });
  } catch (error) {
    console.error('Download initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate download' });
  }
});

router.get('/file/:token', async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    const { token } = req.params;

    // Prefer user-scoped client so RLS can see auth.uid() for token owner.
    const bearerToken = getBearerToken(req);
    const tokenClient = bearerToken
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          },
        })
      : supabase;

    const { data: tokenRecord, error } = await tokenClient
      .from('download_tokens')
      .select('id, token, paper_id, user_id, expires_at, revoked_at, used_at, created_at, papers(title, file_url), profiles(full_name, email)')
      .eq('token', token)
      .single();

    if (error || !tokenRecord) {
      if (error) {
        console.warn('Download token lookup failed:', error);
      }
      return res.status(404).json({ error: 'Token not found' });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    if (tokenRecord.revoked_at) {
      return res.status(400).json({ error: 'Token revoked' });
    }

    const paper = tokenRecord.papers;
    if (!paper?.file_url) {
      return res.status(404).json({ error: 'Paper file not found' });
    }

    const upstream = await fetch(paper.file_url);
    if (!upstream.ok) {
      return res.status(502).json({ error: 'Unable to fetch source file' });
    }

    const sourceBytes = Buffer.from(await upstream.arrayBuffer());
    const sourceContentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const urlExt = getExtensionFromUrl(paper.file_url);
    const isPdf = sourceContentType.includes('pdf') || urlExt === 'pdf';
    const isDocx = sourceContentType.includes('wordprocessingml.document') || urlExt === 'docx';

    const dateLabel = new Date(tokenRecord.created_at || Date.now()).toISOString().split('T')[0];
    const downloaderName = tokenRecord.profiles?.full_name
      || tokenRecord.profiles?.email
      || '';
    const watermarkText = buildWatermarkText(tokenRecord.token, dateLabel, downloaderName);

    let outputBytes = sourceBytes;
    let outputContentType = sourceContentType;
    let outputExt = urlExt;

    if (isPdf) {
      outputBytes = await addPdfFooterWatermark(sourceBytes, watermarkText);
      outputContentType = 'application/pdf';
      outputExt = 'pdf';
    } else if (isDocx) {
      outputBytes = await addDocxFooterWatermark(sourceBytes, watermarkText);
      outputContentType = DOCX_CONTENT_TYPE;
      outputExt = 'docx';
    }

    const baseName = sanitizeFilename(paper.title || 'paper');
    const outputFilename = `${baseName}${isPdf || isDocx ? '_watermarked' : ''}.${outputExt}`;

    await tokenClient
      .from('download_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id)
      .is('used_at', null);

    res.setHeader('Content-Type', outputContentType);
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    return res.send(outputBytes);
  } catch (error) {
    console.error('Token file download error:', error);
    return res.status(500).json({ error: 'Failed to process watermarked download' });
  }
});

router.get('/verify/:token', async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    const { token } = req.params;

    const { data: tokenRecord, error } = await supabase
      .from('download_tokens')
      .select('*, papers(title)')
      .eq('token', token)
      .single();

    if (error || !tokenRecord) {
      return res.status(404).json({ valid: false, error: 'Token not found' });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(400).json({ valid: false, error: 'Token expired' });
    }

    if (tokenRecord.revoked_at) {
      return res.status(400).json({ valid: false, error: 'Token revoked' });
    }

    if (tokenRecord.used_at) {
      return res.status(400).json({ valid: false, error: 'Token already used' });
    }

    res.json({
      valid: true,
      paperId: tokenRecord.paper_id,
      paperTitle: tokenRecord.papers?.title,
      expiresAt: tokenRecord.expires_at
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

router.post('/revoke', async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    const authToken = getBearerToken(req);
    const { token } = req.body;

    if (!authToken) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header. Bearer token required.' });
    }

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    const { data, error } = await supabase
      .from('download_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token', token)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to revoke token' });
    }

    res.json({ success: true, revoked: !!data });
  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

router.post('/counts', async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    const { paperIds } = req.body || {};

    if (!Array.isArray(paperIds)) {
      return res.status(400).json({ error: 'paperIds must be an array' });
    }

    if (paperIds.length === 0) {
      return res.json({ counts: {} });
    }

    const { data, error } = await supabase
      .from('downloads')
      .select('paper_id')
      .in('paper_id', paperIds);

    if (error) {
      console.error('Failed to fetch download counts:', error);
      return res.status(500).json({ error: 'Failed to fetch download counts' });
    }

    const counts = {};
    for (const row of data || []) {
      counts[row.paper_id] = (counts[row.paper_id] || 0) + 1;
    }

    return res.json({ counts });
  } catch (error) {
    console.error('Download counts error:', error);
    return res.status(500).json({ error: 'Failed to fetch download counts' });
  }
});

router.get('/health', async (req, res) => {
  const cloudinaryStatus = await validateCloudinaryConfig();
  res.json({
    server: 'ok',
    cloudinary: cloudinaryStatus
  });
});

export default router;
