import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { useUiStore } from '../../store/uiStore.js';
import * as productsApi from '../../api/productsApi.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import ProductDetailModal from '../../components/products/ProductDetailModal.jsx';

// Custom styles for react-data-table-component
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

function ProductsListPage() {
    const navigate = useNavigate();
    const showNotification = useUiStore((state) => state.showNotification);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
    const [deleting, setDeleting] = useState(false);

    // Detail modal state
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const handleRowClick = (row) => {
        setSelectedProduct(row);
        setShowDetailModal(true);
    };

    const loadProducts = async (page, limit, search, category, isActive) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
            };
            if (search) params.search = search;
            if (category) params.category = category;
            if (isActive !== '') params.isActive = isActive;

            const data = await productsApi.getProducts(params);
            setProducts(data.products || []);
            setTotalRows(data.pagination?.total || 0);
        } catch (err) {
            showNotification('Failed to load products', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts(currentPage, perPage, searchTerm, filterCategory, filterStatus);
    }, [currentPage, perPage, searchTerm, filterCategory, filterStatus]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handlePerRowsChange = async (newPerPage, page) => {
        setPerPage(newPerPage);
        setCurrentPage(page);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const openDeleteModal = (id, name) => {
        setDeleteModal({ open: true, id, name });
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await productsApi.deleteProduct(deleteModal.id);
            showNotification('Product deleted successfully', 'success');
            setDeleteModal({ open: false, id: null, name: '' });
            loadProducts(currentPage, perPage, searchTerm, filterCategory, filterStatus);
        } catch (err) {
            showNotification(err.message || 'Failed to delete product', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const columns = useMemo(() => [
        {
            name: 'SKU',
            selector: row => row.sku,
            sortable: true,
            width: '120px',
            cell: row => (
                <span style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--primary-600)' }}>
                    {row.sku}
                </span>
            ),
        },
        {
            name: 'Product Name',
            selector: row => row.name,
            sortable: true,
            cell: row => (
                <div>
                    <div style={{ fontWeight: 500 }}>{row.name}</div>
                    {row.barcode && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            Barcode: {row.barcode}
                        </div>
                    )}
                </div>
            ),
        },
        {
            name: 'Category',
            selector: row => row.category,
            sortable: true,
            width: '130px',
            cell: row => row.category ? (
                <span className="badge badge-neutral">{row.category}</span>
            ) : '-',
        },
        {
            name: 'Base Price',
            selector: row => row.basePrice,
            sortable: true,
            width: '140px',
            cell: row => (
                <span style={{ fontWeight: 600, color: 'var(--success-600)' }}>
                    Rp {parseFloat(row.basePrice).toLocaleString('id-ID')}
                </span>
            ),
        },
        {
            name: 'Unit',
            selector: row => row.unit,
            width: '80px',
        },
        {
            name: 'Status',
            selector: row => row.isActive,
            width: '100px',
            cell: row => (
                <span className={`badge ${row.isActive ? 'badge-success' : 'badge-error'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            name: 'Actions',
            width: '150px',
            cell: row => (
                <div className="action-buttons">
                    <button
                        className="action-btn edit"
                        onClick={() => navigate(`/products/${row.id}/edit`)}
                    >
                        Edit
                    </button>
                    <button
                        className="action-btn delete"
                        onClick={() => openDeleteModal(row.id, row.name)}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ], [navigate]);

    // Get unique categories for filter
    const categories = useMemo(() => {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        return cats.sort();
    }, [products]);

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Products</h1>
                    <p className="page-subtitle">Manage your product catalog</p>
                </div>
                <button className="btn-primary btn-lg" onClick={() => navigate('/products/new')}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Product
                </button>
            </div>

            <div className="filter-bar">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={handleSearch}
                    style={{ flex: 1, maxWidth: '320px' }}
                />
                <select
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                    style={{ width: '160px' }}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    style={{ width: '130px' }}
                >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>
            </div>

            <div className="data-table-container">
                <DataTable
                    columns={columns}
                    data={products}
                    progressPending={loading}
                    pagination
                    paginationServer
                    paginationTotalRows={totalRows}
                    onChangeRowsPerPage={handlePerRowsChange}
                    onChangePage={handlePageChange}
                    customStyles={customStyles}
                    highlightOnHover
                    pointerOnHover
                    onRowClicked={handleRowClick}
                    noDataComponent={
                        <div className="empty-state">
                            <div className="empty-state-icon">📦</div>
                            <div className="empty-state-title">No products found</div>
                            <p>Get started by adding your first product</p>
                        </div>
                    }
                />
            </div>

            <ConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: null, name: '' })}
                onConfirm={handleDelete}
                title="Delete Product"
                message="Are you sure you want to delete"
                itemName={deleteModal.name}
                confirmText="Delete"
                confirmStyle="danger"
                loading={deleting}
            />

            <ProductDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                product={selectedProduct}
            />
        </div>
    );
}

export default ProductsListPage;
