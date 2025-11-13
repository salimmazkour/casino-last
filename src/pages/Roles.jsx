import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Roles.css';

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 3,
    is_active: true,
    personal_offer_limit: 0,
    personal_offer_max_amount: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
        supabase.from('roles').select('*').order('level', { ascending: true }),
        supabase.from('permissions').select('*').order('module', { ascending: true }),
        supabase.from('role_permissions').select('role_id, permission_id')
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;
      if (rolePermsRes.error) throw rolePermsRes.error;

      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);

      const permMap = {};
      (rolePermsRes.data || []).forEach(rp => {
        if (!permMap[rp.role_id]) permMap[rp.role_id] = [];
        permMap[rp.role_id].push(rp.permission_id);
      });
      setRolePermissions(permMap);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode, role = null) => {
    setModalMode(mode);
    if (mode === 'edit' && role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        level: role.level,
        is_active: role.is_active,
        personal_offer_limit: role.personal_offer_limit || 0,
        personal_offer_max_amount: role.personal_offer_max_amount || 0
      });
      setSelectedRole(role);
    } else {
      setFormData({
        name: '',
        description: '',
        level: 3,
        is_active: true,
        personal_offer_limit: 0,
        personal_offer_max_amount: 0
      });
      setSelectedRole(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Le nom du rôle est requis');
      return;
    }

    try {
      if (modalMode === 'create') {
        const { error } = await supabase.from('roles').insert([formData]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roles')
          .update(formData)
          .eq('id', selectedRole.id);
        if (error) throw error;
      }

      await loadData();
      closeModal();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement: ' + error.message);
    }
  };

  const handleDelete = async (role) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const togglePermission = async (roleId, permissionId) => {
    const hasPermission = rolePermissions[roleId]?.includes(permissionId);

    try {
      if (hasPermission) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId)
          .eq('permission_id', permissionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert([{ role_id: roleId, permission_id: permissionId }]);
        if (error) throw error;
      }

      await loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification de la permission');
    }
  };

  const groupPermissionsByModule = () => {
    const grouped = {};
    permissions.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    return grouped;
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  const permsByModule = groupPermissionsByModule();

  return (
    <div className="roles-container">
      <div className="roles-header">
        <h2>Gestion des Rôles</h2>
        <button className="btn-primary" onClick={() => openModal('create')}>
          Nouveau Rôle
        </button>
      </div>

      <div className="roles-list">
        {roles.map(role => (
          <div key={role.id} className="role-card">
            <div className="role-card-header">
              <div>
                <h3>{role.name}</h3>
                <p className="role-description">{role.description}</p>
                <div className="role-badges">
                  <span className={`role-badge level-${role.level}`}>
                    Niveau {role.level}
                  </span>
                  {!role.is_active && (
                    <span className="role-badge inactive">Inactif</span>
                  )}
                </div>
                {(role.personal_offer_limit > 0 || role.personal_offer_max_amount > 0) && (
                  <p className="role-offers">
                    🎁 Offerts: {role.personal_offer_limit || 0}/jour · Max {role.personal_offer_max_amount || 0}€
                  </p>
                )}
              </div>
              <div className="role-actions">
                <button
                  className="btn-icon edit"
                  onClick={() => openModal('edit', role)}
                  title="Modifier"
                >
                  ✏️
                </button>
                <button
                  className="btn-icon delete"
                  onClick={() => handleDelete(role)}
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="permissions-section">
              <h4>Permissions</h4>
              <div className="permissions-grid">
                {Object.keys(permsByModule).map(module => (
                  <div key={module} className="module-permissions">
                    <div className="module-name">{module}</div>
                    <div className="permission-checks">
                      {permsByModule[module].map(perm => (
                        <label key={perm.id} className="permission-check">
                          <input
                            type="checkbox"
                            checked={rolePermissions[role.id]?.includes(perm.id) || false}
                            onChange={() => togglePermission(role.id, perm.id)}
                          />
                          <span>{perm.display_name || perm.action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Nouveau Rôle' : 'Modifier le Rôle'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom du rôle *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
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

              <div className="form-group">
                <label>Niveau hiérarchique</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                >
                  <option value="1">1 - Administrateur</option>
                  <option value="2">2 - Manager</option>
                  <option value="3">3 - Employé</option>
                </select>
              </div>

              <div className="form-group">
                <label>Offerts personnels - Limite par jour</label>
                <input
                  type="number"
                  min="0"
                  value={formData.personal_offer_limit}
                  onChange={(e) => setFormData({ ...formData, personal_offer_limit: parseInt(e.target.value) || 0 })}
                />
                <small>Nombre d'offerts autorisés par jour (0 = aucun offert autorisé)</small>
              </div>

              <div className="form-group">
                <label>Offerts personnels - Montant maximum</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.personal_offer_max_amount}
                  onChange={(e) => setFormData({ ...formData, personal_offer_max_amount: parseFloat(e.target.value) || 0 })}
                />
                <small>Montant maximum par offert en € (0 = pas de limite)</small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Rôle actif</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
