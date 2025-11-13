import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import './Users.css';

export default function Users() {
  const { canCreate, canUpdate, canDelete, hasPermission } = usePermissions();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [salesPoints, setSalesPoints] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [employeePermissions, setEmployeePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    full_name: '',
    email: '',
    role_id: '',
    phone: '',
    hourly_rate: '',
    personal_offer_limit: 0,
    allowed_product_families: [],
    points_of_sale: [],
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, rolesRes, salesPointsRes, categoriesRes, permsRes, rolePermsRes, empPermsRes] = await Promise.all([
        supabase.from('employees').select('*, roles(name, level)').order('full_name'),
        supabase.from('roles').select('*').eq('is_active', true).order('level'),
        supabase.from('sales_points').select('id, name, type').eq('is_active', true),
        supabase.from('product_categories').select('id, name').is('parent_id', null),
        supabase.from('permissions').select('*').order('module', { ascending: true }),
        supabase.from('role_permissions').select('role_id, permission_id'),
        supabase.from('employee_permissions').select('employee_id, permission_id, is_granted')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (salesPointsRes.error) throw salesPointsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (permsRes.error) throw permsRes.error;
      if (rolePermsRes.error) throw rolePermsRes.error;
      if (empPermsRes.error) throw empPermsRes.error;

      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
      setSalesPoints(salesPointsRes.data || []);
      setProductCategories(categoriesRes.data || []);
      setPermissions(permsRes.data || []);

      const rolePermMap = {};
      (rolePermsRes.data || []).forEach(rp => {
        if (!rolePermMap[rp.role_id]) rolePermMap[rp.role_id] = [];
        rolePermMap[rp.role_id].push(rp.permission_id);
      });
      setRolePermissions(rolePermMap);

      const empPermMap = {};
      (empPermsRes.data || []).forEach(ep => {
        if (!empPermMap[ep.employee_id]) empPermMap[ep.employee_id] = {};
        empPermMap[ep.employee_id][ep.permission_id] = ep.is_granted;
      });
      setEmployeePermissions(empPermMap);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({
      login: '',
      password: '',
      full_name: '',
      email: '',
      role_id: '',
      phone: '',
      hourly_rate: '',
      personal_offer_limit: 0,
      personal_offer_max_amount: 0,
      allowed_product_families: [],
      points_of_sale: [],
      is_active: true
    });
    setShowModal(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setFormData({
      login: user.login || '',
      password: '',
      full_name: user.full_name || '',
      email: user.email || '',
      role_id: user.role_id || '',
      phone: user.phone || '',
      hourly_rate: user.hourly_rate || '',
      personal_offer_limit: user.personal_offer_limit || 0,
      personal_offer_max_amount: user.personal_offer_max_amount || 0,
      allowed_product_families: user.allowed_product_families || [],
      points_of_sale: user.points_of_sale || [],
      is_active: user.is_active !== false
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.login || !formData.full_name || !formData.role_id) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('Le mot de passe est obligatoire pour un nouvel utilisateur');
      return;
    }

    try {
      const dataToSend = {
        action: editingUser ? 'update' : 'create',
        data: {
          id: editingUser?.id,
          login: formData.login,
          password: formData.password || undefined,
          full_name: formData.full_name,
          email: formData.email || null,
          role_id: formData.role_id,
          phone: formData.phone || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          personal_offer_limit: parseInt(formData.personal_offer_limit) || 0,
          personal_offer_max_amount: parseFloat(formData.personal_offer_max_amount) || 0,
          allowed_product_families: formData.allowed_product_families,
          points_of_sale: formData.points_of_sale,
          is_active: formData.is_active
        }
      };

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-employee`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur: ' + error.message);
    }
  }

  async function handleDelete(user) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.full_name}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', user.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur: ' + error.message);
    }
  }

  function toggleCategory(categoryId) {
    setFormData(prev => ({
      ...prev,
      allowed_product_families: prev.allowed_product_families.includes(categoryId)
        ? prev.allowed_product_families.filter(id => id !== categoryId)
        : [...prev.allowed_product_families, categoryId]
    }));
  }

  function toggleSalesPoint(salesPointId) {
    setFormData(prev => ({
      ...prev,
      points_of_sale: prev.points_of_sale.includes(salesPointId)
        ? prev.points_of_sale.filter(id => id !== salesPointId)
        : [...prev.points_of_sale, salesPointId]
    }));
  }

  function openPermissionsModal(user) {
    setPermissionsUser(user);
    setShowPermissionsModal(true);
  }

  function getUserEffectivePermissions(user) {
    if (!user.role_id) return new Set();
    const rolePerms = new Set(rolePermissions[user.role_id] || []);
    const empPerms = employeePermissions[user.id] || {};

    Object.keys(empPerms).forEach(permId => {
      if (empPerms[permId]) {
        rolePerms.add(permId);
      } else {
        rolePerms.delete(permId);
      }
    });

    return rolePerms;
  }

  function getPermissionState(userId, permissionId, roleId) {
    const empPerms = employeePermissions[userId] || {};
    if (empPerms[permissionId] !== undefined) {
      return { state: empPerms[permissionId] ? 'granted' : 'revoked', custom: true };
    }
    const hasRolePerm = rolePermissions[roleId]?.includes(permissionId);
    return { state: hasRolePerm ? 'granted' : 'none', custom: false };
  }

  async function toggleUserPermission(userId, permissionId, roleId) {
    const currentState = getPermissionState(userId, permissionId, roleId);
    const hasRolePerm = rolePermissions[roleId]?.includes(permissionId);

    try {
      if (currentState.custom) {
        await supabase
          .from('employee_permissions')
          .delete()
          .eq('employee_id', userId)
          .eq('permission_id', permissionId);
      } else {
        const isGranted = !hasRolePerm;
        await supabase
          .from('employee_permissions')
          .upsert({
            employee_id: userId,
            permission_id: permissionId,
            is_granted: isGranted
          }, {
            onConflict: 'employee_id,permission_id'
          });
      }

      await loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification de la permission');
    }
  }

  function groupPermissionsByModule() {
    const grouped = {};
    permissions.forEach(perm => {
      if (!grouped[perm.module]) grouped[perm.module] = [];
      grouped[perm.module].push(perm);
    });
    return grouped;
  }

  if (loading) {
    return <div className="users-page loading">Chargement...</div>;
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Gestion des Utilisateurs</h1>
        {canCreate('users') && (
          <button className="btn-primary" onClick={openCreateModal}>
            Nouvel Utilisateur
          </button>
        )}
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Login</th>
              <th>Rôle</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Offerts/jour</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={!user.is_active ? 'inactive' : ''}>
                <td>{user.full_name}</td>
                <td>{user.login}</td>
                <td>
                  <span className={`role-badge level-${user.roles?.level || 3}`}>
                    {user.roles?.name || user.role}
                  </span>
                </td>
                <td>{user.email || '-'}</td>
                <td>{user.phone || '-'}</td>
                <td>{user.personal_offer_limit || 0}</td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    {canUpdate('users') && (
                      <button className="btn-icon" onClick={() => openEditModal(user)} title="Modifier">
                        ✏️
                      </button>
                    )}
                    {hasPermission('users', 'manage_permissions') && (
                      <button className="btn-icon" onClick={() => openPermissionsModal(user)} title="Permissions">
                        🔐
                      </button>
                    )}
                    {canDelete('users') && (
                      <button className="btn-icon delete" onClick={() => handleDelete(user)} title="Supprimer">
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPermissionsModal && permissionsUser && (
        <div className="modal-overlay" onClick={() => setShowPermissionsModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Permissions de {permissionsUser.full_name}</h2>
                <p className="modal-subtitle">
                  Rôle de base : {permissionsUser.roles?.name || permissionsUser.role}
                </p>
                <p className="modal-info">
                  ✓ = Accordée par le rôle | + = Accordée personnellement | - = Révoquée personnellement | ○ = Non accordée par le rôle
                </p>
                <p className="modal-info">
                  💡 Cliquez sur une permission pour basculer entre l'état hérité du rôle et un état personnalisé
                </p>
              </div>
              <button className="close-btn" onClick={() => setShowPermissionsModal(false)}>×</button>
            </div>

            <div className="permissions-modal-content">
              {Object.entries(groupPermissionsByModule()).map(([module, perms]) => (
                <div key={module} className="permission-module-section">
                  <h3 className="module-title">{module}</h3>
                  <div className="permissions-list">
                    {perms.map(perm => {
                      const permState = getPermissionState(permissionsUser.id, perm.id, permissionsUser.role_id);
                      return (
                        <div
                          key={perm.id}
                          className={`permission-item ${permState.state} ${permState.custom ? 'custom' : ''}`}
                          onClick={() => toggleUserPermission(permissionsUser.id, perm.id, permissionsUser.role_id)}
                        >
                          <div className="permission-status">
                            {permState.custom && permState.state === 'granted' && <span className="icon">+</span>}
                            {permState.custom && permState.state === 'revoked' && <span className="icon">-</span>}
                            {!permState.custom && permState.state === 'granted' && <span className="icon">✓</span>}
                            {!permState.custom && permState.state === 'none' && <span className="icon empty">○</span>}
                          </div>
                          <div className="permission-label">
                            {perm.display_name || perm.action}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowPermissionsModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom complet *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Login *</label>
                  <input
                    type="text"
                    value={formData.login}
                    onChange={e => setFormData({...formData, login: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Mot de passe {!editingUser && '*'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : ''}
                    required={!editingUser}
                  />
                </div>

                <div className="form-group">
                  <label>Rôle *</label>
                  <select
                    value={formData.role_id}
                    onChange={e => setFormData({...formData, role_id: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner un rôle</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Taux horaire (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={e => setFormData({...formData, hourly_rate: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Limite offerts/jour</label>
                  <input
                    type="number"
                    value={formData.personal_offer_limit}
                    onChange={e => setFormData({...formData, personal_offer_limit: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Montant max par offert (FCFA)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.personal_offer_max_amount || 0}
                    onChange={e => setFormData({...formData, personal_offer_max_amount: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Points de vente autorisés</h3>
                <div className="checkbox-grid">
                  {salesPoints.map(sp => (
                    <label key={sp.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.points_of_sale.includes(sp.id)}
                        onChange={() => toggleSalesPoint(sp.id)}
                      />
                      <span>{sp.name} ({sp.type})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Familles de produits autorisées pour offerts</h3>
                <div className="checkbox-grid">
                  {productCategories.map(cat => (
                    <label key={cat.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.allowed_product_families.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  />
                  <span>Utilisateur actif</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
