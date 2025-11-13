import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './ProductTypes.css';

const ProductTypes = () => {
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    can_be_sold: false,
    is_active: true
  });
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadProductTypes();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const loadProductTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_types')
        .select('*');

      if (error) throw error;
      setProductTypes(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des types de produits:', error);
      alert('Erreur lors du chargement des types de produits');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingType) {
        const { error } = await supabase
          .from('product_types')
          .update({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            can_be_sold: formData.can_be_sold,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingType.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_types')
          .insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingType(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        can_be_sold: false,
        is_active: true
      });
      loadProductTypes();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du type de produit');
    }
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      code: type.code,
      description: type.description || '',
      can_be_sold: type.can_be_sold,
      is_active: type.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de produit ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadProductTypes();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du type de produit');
    }
  };

  const openCreateModal = () => {
    setEditingType(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      can_be_sold: false,
      is_active: true
    });
    setShowModal(true);
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="product-types-container">
      <div className="types-header">
        <h2>Types de produits</h2>
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
            <option value="code">Trier par Code</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn-sort"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            + Nouveau type
          </button>
        </div>
      </div>

      <div className="types-grid">
        {productTypes
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
          .map((type) => (
          <div key={type.id} className="type-card">
            <div className="type-card-header">
              <h3>{type.name}</h3>
              <span className={`type-badge ${type.is_active ? 'active' : 'inactive'}`}>
                {type.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="type-card-body">
              <p className="type-code">Code: {type.code}</p>
              {type.description && (
                <p className="type-description">{type.description}</p>
              )}
              <p className="type-can-sell">
                {type.can_be_sold ? '✓ Peut être vendu' : '✗ Non vendable'}
              </p>
            </div>
            <div className="type-card-footer">
              <button className="btn-edit" onClick={() => handleEdit(type)}>
                Modifier
              </button>
              <button className="btn-delete" onClick={() => handleDelete(type.id)}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingType ? 'Modifier le type' : 'Nouveau type'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="Ex: SALES, RAW_MATERIAL"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.can_be_sold}
                    onChange={(e) => setFormData({ ...formData, can_be_sold: e.target.checked })}
                  />
                  Peut être vendu directement
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Actif
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingType ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTypes;
