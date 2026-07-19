import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import MasterManagementTable from '../../components/MasterManagementTable.jsx';
import MasterFormModal from '../../components/MasterFormModal.jsx';
import '../../styles.css';

import { API_BASE_URL } from '../../config/env.js';
const API_URL = API_BASE_URL;

const PLANT_COLUMNS = [
  { key: 'plantName', label: 'Plant Name', sortable: true },
  { key: 'plantCode', label: 'Plant Code', sortable: true },
  { key: 'location', label: 'Location', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  {
    key: 'status',
    label: 'Status',
    render: (val) => <span className={`badge badge-${val === 'active' ? 'success' : 'danger'}`}>{val}</span>
  }
];

const PLANT_FORM_FIELDS = [
  { key: 'plantName', label: 'Plant Name', type: 'text', required: true, placeholder: 'Enter plant name' },
  { key: 'plantCode', label: 'Plant Code', type: 'text', placeholder: 'Enter plant code' },
  { key: 'clientCompanyId', label: 'Client Company', type: 'select', placeholder: 'Select client company', options: [] },
  { key: 'location', label: 'Location', type: 'text', placeholder: 'Enter location' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'Enter email' },
  { key: 'mobileNumber', label: 'Mobile Number', type: 'tel', placeholder: 'Enter mobile number' },
  { key: 'address', label: 'Address', type: 'textarea', placeholder: 'Enter address' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Enter remarks' }
];

export default function PlantMasterPage() {
  const { token } = useAuth();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clientCompanies, setClientCompanies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchPlants();
    fetchClientCompanies();
  }, [token]);

  const fetchClientCompanies = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/client-companies?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch client companies');
      const data = await response.json();
      setClientCompanies(data.items || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchPlants = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/plants?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch plants');
      const data = await response.json();
      setPlants(data.items || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch plants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPlant(null);
    setIsModalOpen(true);
  };

  const handleEdit = (plant) => {
    setEditingPlant(plant);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this plant?')) return;

    try {
      const response = await fetch(`${API_URL}/api/plants/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete plant');
      await fetchPlants();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete plant');
    }
  };

  const handleSavePlant = async (formData) => {
    try {
      const method = editingPlant ? 'PATCH' : 'POST';
      const url = editingPlant
        ? `${API_URL}/api/plants/${editingPlant._id}`
        : `${API_URL}/api/plants`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save plant');
      setIsModalOpen(false);
      await fetchPlants();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save plant');
    }
  };

  return (
    <div className="page-container">
      <MasterManagementTable
        title="Plant Masters"
        columns={PLANT_COLUMNS}
        data={plants}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        searchPlaceholder="Search by plant name, code, or location..."
      />

      <MasterFormModal
        isOpen={isModalOpen}
        title={editingPlant ? 'Edit Plant' : 'Create New Plant'}
        fields={PLANT_FORM_FIELDS.map((field) => field.key === 'clientCompanyId' ? { ...field, options: clientCompanies.map((company) => ({ value: company._id, label: company.companyName })) } : field)}
        initialData={editingPlant}
        onSave={handleSavePlant}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
}
