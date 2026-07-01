import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import MasterManagementTable from '../../components/MasterManagementTable.jsx';
import MasterFormModal from '../../components/MasterFormModal.jsx';
import '../../styles.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const CLIENT_COLUMNS = [
  { key: 'companyName', label: 'Company Name', sortable: true },
  { key: 'companyCode', label: 'Company Code', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'mobileNumber', label: 'Mobile', sortable: true },
  {
    key: 'status',
    label: 'Status',
    render: (val) => <span className={`badge badge-${val === 'active' ? 'success' : 'danger'}`}>{val}</span>
  }
];

const CLIENT_FORM_FIELDS = [
  { key: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Enter company name' },
  { key: 'companyCode', label: 'Company Code', type: 'text', placeholder: 'Enter company code' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'Enter email' },
  { key: 'mobileNumber', label: 'Mobile Number', type: 'tel', placeholder: 'Enter mobile number' },
  { key: 'address', label: 'Address', type: 'textarea', placeholder: 'Enter address' },
  { key: 'gstin', label: 'GSTIN', type: 'text', placeholder: 'Enter GSTIN' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Enter remarks' }
];

export default function ClientCompanyMasterPage() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchCompanies();
  }, [token]);

  const fetchCompanies = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/client-companies?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch client companies');
      const data = await response.json();
      setCompanies(data.items || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch client companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCompany(null);
    setIsModalOpen(true);
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this client company?')) return;

    try {
      const response = await fetch(`${API_URL}/api/client-companies/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete client company');
      await fetchCompanies();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete client company');
    }
  };

  const handleSaveCompany = async (formData) => {
    try {
      const method = editingCompany ? 'PATCH' : 'POST';
      const url = editingCompany
        ? `${API_URL}/api/client-companies/${editingCompany._id}`
        : `${API_URL}/api/client-companies`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save client company');
      setIsModalOpen(false);
      await fetchCompanies();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save client company');
    }
  };

  return (
    <div className="page-container">
      <MasterManagementTable
        title="Client Company Masters"
        columns={CLIENT_COLUMNS}
        data={companies}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        searchPlaceholder="Search by company name or code..."
      />

      <MasterFormModal
        isOpen={isModalOpen}
        title={editingCompany ? 'Edit Client Company' : 'Create New Client Company'}
        fields={CLIENT_FORM_FIELDS}
        initialData={editingCompany}
        onSave={handleSaveCompany}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
}
