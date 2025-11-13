import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './StorageLocations.css';

export default function StorageLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true,
  });
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('storage_locations')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setLocations(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingLocation) {
        const { error } = await supabase
          .from('storage_locations')
          .update(formData)
          .eq('id', editingLocation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('storage_locations')
          .insert(formData);

        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      loadLocations();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      code: location.code,
      description: location.description || '',
      is_active: location.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce dépôt de stockage ?')) return;

    try {
      const { error } = await supabase
        .from('storage_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadLocations();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      is_active: true,
    });
    setEditingLocation(null);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredLocations = locations
    .filter(loc =>
      loc.name.toLowerCase().includes(searchText.toLowerCase()) ||
      loc.code.toLowerCase().includes(searchText.toLowerCase()) ||
      (loc.description && loc.description.toLowerCase().includes(searchText.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      if (sortField === 'is_active') {
        aValue = a.is_active ? 1 : 0;
        bValue = b.is_active ? 1 : 0;
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="storage-locations-page">
      <div className="page-header">
        <h1>Dépôts de Stockage</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Nouveau Dépôt
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher un dépôt..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="table-container">
        <table className="locations-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Nom {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('code')} style={{ cursor: 'pointer' }}>
                Code {sortField === 'code' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>
                Description {sortField === 'description' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('is_active')} style={{ cursor: 'pointer' }}>
                Statut {sortField === 'is_active' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLocations.map(location => (
              <tr key={location.id}>
                <td><strong>{location.name}</strong></td>
                <td><code>{location.code}</code></td>
                <td>{location.description || '-'}</td>
                <td>
                  <span className={`status-badge ${location.is_active ? 'active' : 'inactive'}`}>
                    {location.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn-edit" onClick={() => handleEdit(location)}>✏️</button>
                    <button className="btn-delete" onClick={() => handleDelete(location.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLocation ? 'Modifier le dépôt' : 'Nouveau dépôt'}</h2>
              <button className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Actif
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowModal(false); resetForm(); }}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  {editingLocation ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
