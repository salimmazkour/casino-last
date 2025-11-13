import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './ActionLogs.css';

export default function ActionLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    module: '',
    action_type: '',
    employee_id: '',
    date_from: '',
    date_to: ''
  });
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    loadEmployees();
    loadLogs();
  }, []);

  async function loadEmployees() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error);
    }
  }

  async function loadLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from('user_action_logs')
        .select('*, employees(full_name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.module) {
        query = query.eq('module', filters.module);
      }
      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }
      if (filters.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error);
      alert('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function handleSearch() {
    loadLogs();
  }

  function handleReset() {
    setFilters({
      module: '',
      action_type: '',
      employee_id: '',
      date_from: '',
      date_to: ''
    });
    setTimeout(() => loadLogs(), 0);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getActionLabel(actionType) {
    const labels = {
      login: 'Connexion',
      logout: 'Déconnexion',
      create_order: 'Création commande',
      modify_order: 'Modification commande',
      void_order: 'Annulation commande',
      apply_discount: 'Application remise',
      apply_personal_offer: 'Offert personnel',
      close_cash_register: 'Clôture caisse',
      create_product: 'Création produit',
      update_product: 'Modification produit',
      delete_product: 'Suppression produit',
      create_user: 'Création utilisateur',
      update_user: 'Modification utilisateur',
      delete_user: 'Suppression utilisateur',
      validate_inventory: 'Validation inventaire',
      stock_movement: 'Mouvement stock',
      update_price: 'Mise à jour prix',
      manage_credit: 'Gestion crédit client'
    };
    return labels[actionType] || actionType;
  }

  function getModuleLabel(module) {
    const labels = {
      pos: 'Point de vente',
      inventory: 'Inventaire',
      products: 'Produits',
      users: 'Utilisateurs',
      reports: 'Rapports',
      clients: 'Clients',
      tables: 'Tables',
      settings: 'Paramètres',
      auth: 'Authentification'
    };
    return labels[module] || module;
  }

  if (loading) {
    return <div className="action-logs-page loading">Chargement...</div>;
  }

  return (
    <div className="action-logs-page">
      <div className="logs-header">
        <h1>Historique des Actions</h1>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Module</label>
            <select
              value={filters.module}
              onChange={e => handleFilterChange('module', e.target.value)}
            >
              <option value="">Tous</option>
              <option value="pos">Point de vente</option>
              <option value="inventory">Inventaire</option>
              <option value="products">Produits</option>
              <option value="users">Utilisateurs</option>
              <option value="clients">Clients</option>
              <option value="auth">Authentification</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Employé</label>
            <select
              value={filters.employee_id}
              onChange={e => handleFilterChange('employee_id', e.target.value)}
            >
              <option value="">Tous</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Date début</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={e => handleFilterChange('date_from', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Date fin</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={e => handleFilterChange('date_to', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn-secondary" onClick={handleReset}>
            Réinitialiser
          </button>
          <button className="btn-primary" onClick={handleSearch}>
            Rechercher
          </button>
        </div>
      </div>

      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Date et heure</th>
              <th>Employé</th>
              <th>Module</th>
              <th>Action</th>
              <th>Détails</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  Aucun log trouvé
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at)}</td>
                  <td>{log.employees?.full_name || 'Système'}</td>
                  <td>
                    <span className="module-badge">
                      {getModuleLabel(log.module)}
                    </span>
                  </td>
                  <td>{getActionLabel(log.action_type)}</td>
                  <td className="details-cell">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{log.ip_address || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
