import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../utils/api.js';
import { showToast, showAlert } from '../../utils/notifications.jsx';

const ERROR_TYPES = [
    'ValidationError', 'DuplicateEntry', 'CastError', 'Authentication', 'Server Error', 'MongooseError'
];

const StatusBadge = ({ status }) => {
    const isResolved = status === 'resolved';
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isResolved 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700 animate-pulse'
        }`}>
            {status?.toUpperCase()}
        </span>
    );
};

export default function SystemMonitoring() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });
    const [filters, setFilters] = useState({
        status: '',
        error_type: '',
        route: '',
        user_id: '',
        startDate: '',
        endDate: ''
    });
    const [selectedLog, setSelectedLog] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedLogIds, setSelectedLogIds] = useState([]);

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                limit: 5,
                ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
            }).toString();

            const response = await apiRequest(`/monitoring/logs?${queryParams}`);
            setLogs(response.logs);
            setPagination({
                currentPage: response.currentPage,
                totalPages: response.totalPages,
                totalLogs: response.totalLogs
            });
        } catch (error) {
            // Error handled by apiRequest
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchLogs(1);
    }, [fetchLogs]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const toggleResolve = async (logId, currentStatus) => {
        const newStatus = currentStatus === 'resolved' ? 'unresolved' : 'resolved';
        try {
            await apiRequest(`/monitoring/logs/${logId}`, {
                method: 'PATCH',
                body: { status: newStatus }
            });
            showToast.success(`Error marked as ${newStatus}`);
            setLogs(prev => prev.map(log => 
                log._id === logId ? { ...log, status: newStatus } : log
            ));
            if (selectedLog?._id === logId) {
                setSelectedLog(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            showToast.error('Failed to update status');
        }
    };

    const deleteLog = async (logId) => {
        const confirmed = await showAlert.confirm('Remove Log?', 'Are you sure you want to delete this log entry?', 'Yes, Delete');
        if (!confirmed) return;
        try {
            await apiRequest(`/monitoring/logs/${logId}`, { method: 'DELETE' });
            showToast.success('Log entry deleted');
            setLogs(prev => prev.filter(log => log._id !== logId));
            setShowModal(false);
        } catch (error) {
            showToast.error('Failed to delete log');
        }
    };

    const clearAllLogs = async () => {
        const confirmed = await showAlert.confirm('CRITICAL ACTION', 'CRITICAL: Are you sure you want to wipe ALL error logs? This cannot be undone.', 'Wipe All Logs');
        if (!confirmed) return;
        try {
            await apiRequest('/monitoring/logs-clear-all', { method: 'DELETE' });
            showToast.success('All logs cleared');
            setLogs([]);
            setPagination({ currentPage: 1, totalPages: 1, totalLogs: 0 });
        } catch (error) {
            showToast.error('Failed to clear logs');
        }
    };

    const openDetails = (log) => {
        setSelectedLog(log);
        setShowModal(true);
    };

    const resolveBulk = async () => {
        if (selectedLogIds.length === 0) return;
        const confirmed = await showAlert.confirm('Resolve Multiple?', `Are you sure you want to resolve ${selectedLogIds.length} selected incidents?`, 'Resolve All');
        if (!confirmed) return;

        try {
            await apiRequest('/monitoring/resolve-bulk', {
                method: 'PATCH',
                body: { logIds: selectedLogIds }
            });
            showToast.success(`${selectedLogIds.length} logs resolved`);
            setLogs(prev => prev.map(log => 
                selectedLogIds.includes(log._id) ? { ...log, status: 'resolved' } : log
            ));
            setSelectedLogIds([]);
        } catch (error) {
            showToast.error('Failed to resolve bulk logs');
        }
    };

    const toggleSelect = (id) => {
        setSelectedLogIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLogIds.length === logs.length) {
            setSelectedLogIds([]);
        } else {
            setSelectedLogIds(logs.map(l => l._id));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                        System Monitoring
                    </h1>
                    <p className="text-gray-500">Real-time system health and error tracking</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => fetchLogs(pagination.currentPage)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <i className={`fa-solid fa-arrows-rotate ${loading ? 'animate-spin' : ''}`}></i>
                        Refresh
                    </button>
                    <button 
                        onClick={clearAllLogs}
                        className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <i className="fa-solid fa-trash-can"></i>
                        Clear All
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Incidents</p>
                    <p className="text-2xl font-bold text-gray-800">{pagination.totalLogs}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unresolved</p>
                    <p className="text-2xl font-bold text-red-600">
                        {logs.some(l => l.status === 'unresolved') ? logs.filter(l => l.status === 'unresolved').length : 0}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Health Status</p>
                    <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Service Operational
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Filters</p>
                    <p className="text-sm text-gray-600">{Object.values(filters).filter(v => v).length} Applied</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select 
                            name="status" 
                            value={filters.status} 
                            onChange={handleFilterChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="unresolved">Unresolved</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Error Type</label>
                        <select 
                            name="error_type" 
                            value={filters.error_type} 
                            onChange={handleFilterChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                            <option value="">All Types</option>
                            {ERROR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Route Search</label>
                        <input 
                            type="text" 
                            name="route" 
                            placeholder="/api/..." 
                            value={filters.route} 
                            onChange={handleFilterChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                        <input 
                            type="date" 
                            name="startDate" 
                            value={filters.startDate} 
                            onChange={handleFilterChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                        <input 
                            type="date" 
                            name="endDate" 
                            value={filters.endDate} 
                            onChange={handleFilterChange}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={async () => {
                                setFilters({ status: '', error_type: '', route: '', user_id: '', startDate: '', endDate: '' });
                                await fetchLogs(1);
                            }}
                            className="w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Floating Bar */}
            {selectedLogIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-10 duration-300">
                    <div className="flex items-center gap-3 border-r border-gray-700 pr-8">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                            {selectedLogIds.length}
                        </span>
                        <p className="text-sm font-medium">Items selected</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={resolveBulk}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                        >
                            <i className="fa-solid fa-check-double"></i>
                            Mark Resolved
                        </button>
                        <button 
                            onClick={() => setSelectedLogIds([])}
                            className="text-gray-400 hover:text-white px-3 py-1.5 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Error Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-bottom border-gray-200">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={logs.length > 0 && selectedLogIds.length === logs.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Error Message</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Route / Method</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center text-gray-400">
                                        <i className="fa-solid fa-shield-check text-4xl mb-3 text-green-100 block"></i>
                                        No system errors found for current filters.
                                    </td>
                                </tr>
                            ) : logs.map(log => (
                                <tr key={log._id} className={`${selectedLogIds.includes(log._id) ? 'bg-primary/5' : 'hover:bg-gray-50/50'} transition-colors group`}>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedLogIds.includes(log._id)}
                                            onChange={() => toggleSelect(log._id)}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{log.message}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{log.error_type}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                log.method === 'GET' ? 'bg-blue-100 text-blue-600' :
                                                log.method === 'POST' ? 'bg-emerald-100 text-emerald-600' :
                                                'bg-amber-100 text-amber-600'
                                            }`}>{log.method}</span>
                                            <span className="text-xs text-gray-600 font-mono truncate max-w-[120px]">{log.route}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-medium text-gray-800">{log.user_id?.name || 'Guest'}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{log.user_id?.email || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="text-xs text-gray-600">{new Date(log.created_at).toLocaleDateString()}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleTimeString()}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={log.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button 
                                            onClick={() => openDetails(log)}
                                            className="text-xs text-primary hover:underline font-medium"
                                        >
                                            View Trace
                                        </button>
                                        <button 
                                            onClick={() => toggleResolve(log._id, log.status)}
                                            className={`p-1.5 rounded-lg border transition-colors ${
                                                log.status === 'resolved' 
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200' 
                                                    : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'
                                            }`}
                                            title={log.status === 'resolved' ? 'Mark as unresolved' : 'Mark as resolved'}
                                        >
                                            <i className="fa-solid fa-check"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Showing page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                disabled={pagination.currentPage === 1}
                                onClick={() => fetchLogs(pagination.currentPage - 1)}
                                className="px-3 py-1 border rounded bg-white text-sm disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button 
                                disabled={pagination.currentPage === pagination.totalPages}
                                onClick={() => fetchLogs(pagination.currentPage + 1)}
                                className="px-3 py-1 border rounded bg-white text-sm disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Detail Modal */}
            {showModal && selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div className="flex items-center gap-3">
                                <StatusBadge status={selectedLog.status} />
                                <h3 className="font-bold text-gray-900">Incident Details</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Metadata</label>
                                        <div className="mt-2 space-y-2">
                                            <p className="text-sm"><strong>Method:</strong> {selectedLog.method}</p>
                                            <p className="text-sm"><strong>Route:</strong> <code className="bg-gray-100 px-1 rounded">{selectedLog.route}</code></p>
                                            <p className="text-sm"><strong>User ID:</strong> {selectedLog.user_id?._id || 'Guest'}</p>
                                            <p className="text-sm"><strong>Status Code:</strong> <span className={selectedLog.status_code >= 500 ? 'text-red-500' : 'text-amber-500'}>{selectedLog.status_code}</span></p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Request Body</label>
                                        <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
                                            {JSON.stringify(selectedLog.request_body, null, 2) || '// No body sent'}
                                        </pre>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Error Context</label>
                                        <div className="mt-2 p-4 bg-red-50 border border-red-100 rounded-xl">
                                            <p className="text-red-800 font-medium">{selectedLog.message}</p>
                                            <p className="text-red-600 text-xs mt-1">Type: {selectedLog.error_type}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resolution Actions</label>
                                        <div className="mt-2 flex gap-3">
                                            <button 
                                                onClick={() => toggleResolve(selectedLog._id, selectedLog.status)}
                                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                                                    selectedLog.status === 'resolved'
                                                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        : 'bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-200'
                                                }`}
                                            >
                                                {selectedLog.status === 'resolved' ? 'Re-open Incident' : 'Resolve Incident'}
                                            </button>
                                            <button 
                                                onClick={() => deleteLog(selectedLog._id)}
                                                className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                                            >
                                                Delete Permanent
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stack Trace</label>
                                <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl group relative">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedLog.stack_trace);
                                            showToast.success('Trace copied to clipboard');
                                        }}
                                        className="absolute right-4 top-4 bg-white shadow-sm border p-1.5 rounded-lg text-gray-400 hover:text-primary transition-opacity opacity-0 group-hover:opacity-100"
                                    >
                                        <i className="fa-solid fa-copy"></i>
                                    </button>
                                    <pre className="text-[11px] font-mono whitespace-pre-wrap text-gray-700 leading-relaxed overflow-x-auto max-h-[300px]">
                                        {selectedLog.stack_trace || 'No stack trace available.'}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
