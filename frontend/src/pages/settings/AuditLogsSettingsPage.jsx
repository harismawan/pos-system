import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import * as auditLogsApi from '../../api/auditLogsApi.js';
import { formatDateTime } from '../../utils/dateUtils.js';

// Custom styles for react-data-table-component (matching ProductsListPage)
const customStyles = {
    table: {
        style: {
            backgroundColor: 'transparent',
        },
    },
    headRow: {
        style: {
            backgroundColor: 'var(--gray-50)',
            borderBottom: '2px solid var(--gray-200)',
            minHeight: '52px',
        },
    },
    headCells: {
        style: {
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--gray-600)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            paddingLeft: '16px',
            paddingRight: '16px',
        },
    },
    rows: {
        style: {
            minHeight: '60px',
            fontSize: '14px',
            color: 'var(--gray-800)',
            '&:hover': {
                backgroundColor: 'var(--gray-50)',
            },
        },
    },
    cells: {
        style: {
            paddingLeft: '16px',
            paddingRight: '16px',
        },
    },
    pagination: {
        style: {
            borderTop: '1px solid var(--gray-200)',
            minHeight: '56px',
        },
    },
};

function AuditLogsSettingsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    // Filters
    const [eventTypes, setEventTypes] = useState([]);
    const [entityTypes, setEntityTypes] = useState([]);
    const [selectedEventType, setSelectedEventType] = useState('');
    const [selectedEntityType, setSelectedEntityType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal
    const [selectedLog, setSelectedLog] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Load filter options
    useEffect(() => {
        loadFilterOptions();
    }, []);

    const loadFilterOptions = async () => {
        try {
            const [eventTypesData, entityTypesData] = await Promise.all([
                auditLogsApi.getEventTypes(),
                auditLogsApi.getEntityTypes(),
            ]);
            setEventTypes(eventTypesData.eventTypes || []);
            setEntityTypes(entityTypesData.entityTypes || []);
        } catch (error) {
            console.error('Failed to load filter options:', error);
        }
    };

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: perPage,
            };
            if (selectedEventType) params.eventType = selectedEventType;
            if (selectedEntityType) params.entityType = selectedEntityType;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const data = await auditLogsApi.getAuditLogs(params);
            setLogs(data.logs || []);
            setTotalRows(data.pagination?.total || 0);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [page, perPage, selectedEventType, selectedEntityType, startDate, endDate]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setShowModal(true);
    };

    const getEventTypeColor = (eventType) => {
        if (eventType?.includes('CREATE')) return 'var(--success-500)';
        if (eventType?.includes('UPDATE') || eventType?.includes('EDIT')) return 'var(--warning-500)';
        if (eventType?.includes('DELETE') || eventType?.includes('DEACTIVATE')) return 'var(--error-500)';
        if (eventType?.includes('LOGIN') || eventType?.includes('AUTH')) return 'var(--info-500)';
        return 'var(--neutral-500)';
    };

    const columns = useMemo(() => [
        {
            name: 'Time',
            selector: row => row.createdAt,
            format: row => formatDateTime(row.createdAt),
            sortable: true,
            width: '180px',
        },
        {
            name: 'Event',
            selector: row => row.eventType,
            cell: row => (
                <span style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: `${getEventTypeColor(row.eventType)}20`,
                    color: getEventTypeColor(row.eventType),
                    fontWeight: 600,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                }}>
                    {row.eventType}
                </span>
            ),
            width: '180px',
        },
        {
            name: 'Entity',
            selector: row => row.entityType,
            cell: row => (
                <span className="badge badge-neutral" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {row.entityType}
                </span>
            ),
            width: '140px',
        },
        {
            name: 'Entity ID',
            selector: row => row.entityId,
            cell: row => (
                <span style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: 'var(--gray-500)',
                }}>
                    {row.entityId}
                </span>
            ),
            width: '140px',
        },
        {
            name: 'User',
            selector: row => row.user?.name,
            cell: row => row.user ? (
                <div style={{ fontWeight: 500 }}>{row.user.name}</div>
            ) : (
                <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>System</span>
            ),
        },
        {
            name: 'Actions',
            cell: row => (
                <button
                    onClick={() => handleViewDetails(row)}
                    className="action-btn edit"
                    style={{ minWidth: '80px', justifyContent: 'center' }}
                >
                    Details
                </button>
            ),
            width: '100px',
            right: true,
        },
    ], []);

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Logs</h1>
                    <p className="page-subtitle">Track user actions and system events</p>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <select
                    value={selectedEventType}
                    onChange={(e) => { setSelectedEventType(e.target.value); setPage(1); }}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--gray-300)',
                        fontSize: '14px'
                    }}
                >
                    <option value="">All Events</option>
                    {eventTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>

                <select
                    value={selectedEntityType}
                    onChange={(e) => { setSelectedEntityType(e.target.value); setPage(1); }}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--gray-300)',
                        fontSize: '14px'
                    }}
                >
                    <option value="">All Entities</option>
                    {entityTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>

                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--gray-300)',
                        fontSize: '14px'
                    }}
                />

                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--gray-300)',
                        fontSize: '14px'
                    }}
                />

                <button
                    className="btn-secondary"
                    onClick={() => {
                        setSelectedEventType('');
                        setSelectedEntityType('');
                        setStartDate('');
                        setEndDate('');
                        setPage(1);
                    }}
                    style={{ padding: '8px 16px' }}
                >
                    Clear
                </button>
            </div>

            {/* Table */}
            <div className="data-table-container">
                <DataTable
                    columns={columns}
                    data={logs}
                    progressPending={loading}
                    pagination
                    paginationServer
                    paginationTotalRows={totalRows}
                    paginationPerPage={perPage}
                    paginationDefaultPage={page}
                    onChangePage={setPage}
                    onChangeRowsPerPage={(newPerPage) => {
                        setPerPage(newPerPage);
                        setPage(1);
                    }}
                    customStyles={customStyles}
                    highlightOnHover
                    responsive
                    noDataComponent={
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-title">No audit logs found</div>
                            <p>Activity logs will appear here</p>
                        </div>
                    }
                />
            </div>

            {/* Detail Modal */}
            {showModal && selectedLog && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Audit Log Details</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="form-label" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Time</label>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{formatDateTime(selectedLog.createdAt)}</div>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ fontSize: '12px', textTransform: 'uppercase' }}>User</label>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedLog.user?.name || 'System'}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="form-label" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Event Type</label>
                                        <div>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                background: `${getEventTypeColor(selectedLog.eventType)}20`,
                                                color: getEventTypeColor(selectedLog.eventType),
                                                fontWeight: 600,
                                                fontSize: '12px',
                                            }}>
                                                {selectedLog.eventType}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Entity</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>{selectedLog.entityType}</code>
                                            <span style={{ color: 'var(--gray-400)' }}>#</span>
                                            <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>{selectedLog.entityId}</code>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="form-label" style={{ fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Payload Data</label>
                                    <pre style={{
                                        background: 'var(--gray-50)',
                                        border: '1px solid var(--gray-200)',
                                        padding: '16px',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        overflow: 'auto',
                                        maxHeight: '300px',
                                        marginTop: 0,
                                    }}>
                                        {JSON.stringify(selectedLog.payload, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AuditLogsSettingsPage;
