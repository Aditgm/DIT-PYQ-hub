import React, { useState, useEffect, useCallback } from 'react'
import { BarChart3, ArrowUpRight, ArrowDownRight, AlertTriangle, TrendingUp, Users, FileCheck, Clock, Filter, Download, RefreshCw, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const UploadAnalyticsDashboard = () => {
  const { isAdmin } = useAuth()
  const [dateRange, setDateRange] = useState('last_14_days')
  const [funnelData, setFunnelData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')

  const loadFunnelData = useCallback(async () => {
    // Use mock data for now - will connect to PostHog backend later
    setFunnelData({
      funnel: [
        { count: 1247, dropOff: 0 },
        { count: 986, dropOff: 20.9 },
        { count: 612, dropOff: 37.9 },
        { count: 447, dropOff: 27.0 },
        { count: 398, dropOff: 11.0 },
        { count: 351, dropOff: 11.8 }
      ],
      avgUploadTime: '8.2',
      recommendations: [
        {
          title: 'High drop-off at file selection',
          severity: 'high',
          description: '38% of users leave after visiting the upload page without selecting a file.',
          suggestion: 'Add file drag-and-drop instructions and reduce visual friction.'
        },
        {
          title: 'Required fields causing friction',
          severity: 'medium',
          description: '27% drop-off between file selection and form completion.',
          suggestion: 'Make Subject and Branch fields optional with sensible defaults.'
        },
        {
          title: 'Upload latency above 8s',
          severity: 'medium',
          description: 'Average upload time is 8.2s, users abandon after 10s.',
          suggestion: 'Implement chunked uploads and progress feedback.'
        }
      ]
    })
    setLoading(false)
  }, [setFunnelData, setLoading])

  useEffect(() => {
    loadFunnelData()
  }, [dateRange, loadFunnelData])

  if (!isAdmin) return null

  const dateRangeOptions = [
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_14_days', label: 'Last 14 days' },
    { value: 'last_28_days', label: 'Last 28 days' },
    { value: 'last_90_days', label: 'Last 90 days' }
  ]

  const funnelSteps = [
    { name: 'Visit Upload Page', key: 'page_visit' },
    { name: 'View Upload Form', key: 'form_view' },
    { name: 'Select File', key: 'file_selected' },
    { name: 'Complete Fields', key: 'fields_completed' },
    { name: 'Submit Upload', key: 'submit_attempt' },
    { name: 'Upload Success', key: 'success' }
  ]

  const getDropOffPercentage = (current, previous) => {
    if (!previous || previous === 0) return 0
    return ((previous - current) / previous * 100).toFixed(1)
  }

  const getDropOffSeverity = (percentage) => {
    if (percentage > 40) return 'high'
    if (percentage > 20) return 'medium'
    return 'low'
  }

  const recommendations = funnelData?.recommendations || [
    {
      title: 'High drop-off at file selection',
      severity: 'high',
      description: '38% of users leave after visiting the upload page without selecting a file.',
      suggestion: 'Add file drag-and-drop instructions and reduce visual friction.'
    },
    {
      title: 'Required fields causing friction',
      severity: 'medium',
      description: '27% drop-off between file selection and form completion.',
      suggestion: 'Make Subject and Branch fields optional with sensible defaults.'
    },
    {
      title: 'Upload latency above 8s',
      severity: 'medium',
      description: 'Average upload time is 8.2s, users abandon after 10s.',
      suggestion: 'Implement chunked uploads and progress feedback.'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const funnel = funnelData?.funnel || [
    { count: 1247, dropOff: 0 },
    { count: 986, dropOff: 20.9 },
    { count: 612, dropOff: 37.9 },
    { count: 447, dropOff: 27.0 },
    { count: 398, dropOff: 11.0 },
    { count: 351, dropOff: 11.8 }
  ]

  const conversionRate = funnel.length > 0 
    ? ((funnel[funnel.length - 1].count / funnel[0].count) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Upload Funnel Analytics
          </h2>
          <p className="text-on-surface-variant">
            Track drop-off and optimize your upload experience
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-surface-container rounded-lg border border-white/10 text-on-surface"
          >
            {dateRangeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <button
            onClick={loadFunnelData}
            className="p-2 bg-surface-container rounded-lg border border-white/10 hover:bg-surface-container-high transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-on-surface-variant" />
          </button>
          
          <button className="p-2 bg-surface-container rounded-lg border border-white/10 hover:bg-surface-container-high transition-colors">
            <Download className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-on-surface-variant text-sm">Total Visitors</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-on-surface">{funnel[0].count.toLocaleString()}</p>
        </div>

        <div className="bg-surface-container rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-on-surface-variant text-sm">Successful Uploads</span>
            <FileCheck className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-on-surface">{funnel[funnel.length - 1].count.toLocaleString()}</p>
        </div>

        <div className="bg-surface-container rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-on-surface-variant text-sm">Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-on-surface">{conversionRate}%</p>
        </div>

        <div className="bg-surface-container rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-on-surface-variant text-sm">Avg Upload Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-on-surface">{funnelData?.avgUploadTime || '8.2'}s</p>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-surface-container rounded-xl border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-on-surface mb-6">Drop-off Funnel</h3>
        
        <div className="space-y-3">
          {funnelSteps.map((step, index) => {
            const dropOff = funnel[index]?.dropOff || 0
            const severity = getDropOffSeverity(dropOff)
            const count = funnel[index]?.count || 0
            
            return (
              <div key={step.key} className="flex items-center gap-4">
                <div className="w-48 text-on-surface font-medium text-sm">
                  {index + 1}. {step.name}
                </div>
                
                <div className="flex-1 relative h-10 bg-surface rounded-lg overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/80 to-primary transition-all"
                    style={{ width: `${(count / funnel[0].count) * 100}%` }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-white">
                    {count.toLocaleString()}
                  </div>
                </div>
                
                {index > 0 && (
                  <div className={`w-24 text-sm font-medium flex items-center gap-1 ${
                    severity === 'high' ? 'text-red-400' : 
                    severity === 'medium' ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {dropOff}% drop-off
                    {dropOff > 20 && <ArrowDownRight className="w-4 h-4" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recommendations Panel */}
      <div className="bg-surface-container rounded-xl border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Optimization Recommendations
        </h3>
        
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border ${
                rec.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                rec.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                'bg-cyan-500/10 border-cyan-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  rec.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                  rec.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {rec.severity === 'high' ? <AlertTriangle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-medium text-on-surface mb-1">{rec.title}</h4>
                  <p className="text-sm text-on-surface-variant mb-2">{rec.description}</p>
                  <p className="text-sm font-medium text-primary">{rec.suggestion}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Implementation Plan */}
      <div className="bg-surface-container rounded-xl border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-on-surface mb-4">Implementation Roadmap</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-surface-container-low border border-white/5">
            <h4 className="font-medium text-on-surface mb-3">Sprint 1 Targets</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Add inline real-time field validation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Reduce required fields from 7 to 4
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Add upload retry logic
              </li>
            </ul>
            <p className="text-sm text-green-400 mt-3 font-medium">Target: +15% conversion</p>
          </div>
          
          <div className="p-4 rounded-lg bg-surface-container-low border border-white/5">
            <h4 className="font-medium text-on-surface mb-3">Sprint 2 Targets</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Implement chunked uploads
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Add form autosave
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Progressive disclosure of advanced fields
              </li>
            </ul>
            <p className="text-sm text-cyan-400 mt-3 font-medium">Target: +25% total conversion</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadAnalyticsDashboard