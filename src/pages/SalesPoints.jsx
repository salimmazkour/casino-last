import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './SalesPoints.css';

export default function SalesPoints() {
  const [salesPoints, setSalesPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bar',
    opening_time: '08:00',
    closing_time: '22:00',
    has_pos: true,
    has_tablets: false,
    is_active: true,
    vat_rate: 10,
  });
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadSalesPoints();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const loadSalesPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_points')
        .select('*');

      if (error) throw error;
      setSalesPoints(data || []);
    } catch (error) {
      console.error('Erreur chargement points de vente:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPoint) {
        const { error } = await supabase
          .from('sales_points')
          .update(formData)
          .eq('id', editingPoint.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sales_points')
          .insert([formData]);
        if (error) throw error;
      }
      resetForm();
      loadSalesPoints();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const handleEdit = (point) => {
    setEditingPoint(point);
    setFormData({
      name: point.name,
      type: point.type,
      opening_time: point.opening_time || '08:00',
      closing_time: point.closing_time || '22:00',
      has_pos: point.has_pos,
      has_tablets: point.has_tablets,
      is_active: point.is_active,
      vat_rate: point.vat_rate || 10,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce point de vente ?')) return;
    try {
      const { error } = await supabase
        .from('sales_points')
        .delete()
        .eq('id', id);
      if (error) throw error;
      loadSalesPoints();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'bar',
      opening_time: '08:00',
      closing_time: '22:00',
      has_pos: true,
      has_tablets: false,
      is_active: true,
      vat_rate: 10,
    });
    setEditingPoint(null);
    setShowModal(false);
  };

  const getTypeLabel = (type) => {
    const types = {
      bar: 'Bar',
      restaurant: 'Restaurant',
      nightclub: 'Boîte de Nuit',
      hotel: 'Hôtel',
      other: 'Autre'
    };
    return types[type] || type;
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="sales-points-container">

      <div className="page-header">
        <h2>Points de Vente</h2>
        <div className="header-actions">
          <select
            value={sortField}
            onChange={(e) => {
              setSortField(e.target.value);
              setSortOrder('asc');
            }}
            className="sort-select"
          >
            <option value="name">Trier par Nom</option>
            <option value="type">Trier par Type</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn-sort"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Nouveau Point de Vente
          </button>
        </div>
      </div>

      <div className="points-grid">
        {salesPoints
          .sort((a, b) => {
            let aValue = a[sortField] || '';
            let bValue = b[sortField] || '';

            if (typeof aValue === 'string') {
              aValue = aValue.toLowerCase();
              bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          })
          .map((point) => (
          <div key={point.id} className={`point-card ${!point.is_active ? 'inactive' : ''}`}>
            <div className="point-header">
              <h3>{point.name}</h3>
              <span className={`status-badge ${point.is_active ? 'active' : 'inactive'}`}>
                {point.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="point-body">
              <div className="point-info">
                <span className="label">Type:</span>
                <span className="value">{getTypeLabel(point.type)}</span>
              </div>
              <div className="point-info">
                <span className="label">Horaires:</span>
                <span className="value">{point.opening_time} - {point.closing_time}</span>
              </div>
              <div className="point-info">
                <span className="label">TVA:</span>
                <span className="value">{point.vat_rate || 10}%</span>
              </div>
              <div className="point-features">
                {point.has_pos && <span className="feature">📟 Caisse</span>}
                {point.has_tablets && <span className="feature">📱 Tablettes</span>}
              </div>
            </div>
            <div className="point-actions">
              <button className="btn-edit" onClick={() => handleEdit(point)}>
                Modifier
              </button>
              <button className="btn-delete" onClick={() => handleDelete(point.id)}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPoint ? 'Modifier' : 'Nouveau'} Point de Vente</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="bar">Bar</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="nightclub">Boîte de Nuit</option>
                    <option value="hotel">Hôtel</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Heure d'ouverture</label>
                  <input
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Heure de fermeture</label>
                  <input
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Taux de TVA (%) - Sénégal</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.vat_rate}
                    onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
                    required
                  />
                  <small style={{color: '#6b7280', marginTop: '4px', display: 'block'}}>
                    Taux standard: 10% (Hôtellerie-Restauration au Sénégal)
                  </small>
                </div>
              </div>

              <div className="form-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.has_pos}
                    onChange={(e) => setFormData({ ...formData, has_pos: e.target.checked })}
                  />
                  <span>Possède une caisse</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.has_tablets}
                    onChange={(e) => setFormData({ ...formData, has_tablets: e.target.checked })}
                  />
                  <span>Possède des tablettes</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Actif</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingPoint ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
