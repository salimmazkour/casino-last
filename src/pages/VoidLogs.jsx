import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './VoidLogs.css';

export default function VoidLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    voidType: 'all',
    dateFrom: '',
    dateTo: '',
    salesPoint: 'all'
  });
  const [salesPoints, setSalesPoints] = useState([]);

  useEffect(() => {
    loadSalesPoints();
    loadLogs();
  }, [filters]);

  const loadSalesPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_points')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSalesPoints(data || []);
    } catch (error) {
      console.error('Erreur chargement points de vente:', error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('void_logs')
        .select(`
          *,
          employees!voided_by(full_name),
          sales_points(name)
        `)
        .order('voided_at', { ascending: false });

      if (filters.voidType !== 'all') {
        query = query.eq('void_type', filters.voidType);
      }

      if (filters.dateFrom) {
        query = query.gte('voided_at', filters.dateFrom + 'T00:00:00');
      }

      if (filters.dateTo) {
        query = query.lte('voided_at', filters.dateTo + 'T23:59:59');
      }

      if (filters.salesPoint !== 'all') {
        query = query.eq('sales_point_id', filters.salesPoint);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      alert('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const getTotalVoided = () => {
    return logs.reduce((sum, log) => sum + parseFloat(log.amount_voided), 0);
  };

  const getProductsDisplay = (productDetails) => {
    if (!productDetails) return 'N/A';

    if (productDetails.items) {
      return productDetails.items.map(item =>
        `${item.product_name} (x${item.quantity})`
      ).join(', ');
    }

    return `${productDetails.product_name} (x${productDetails.quantity})`;
  };

  return (
    <div className="void-logs-container">
      <div className="page-header">
        <h1>Historique des Annulations</h1>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Type:</label>
          <select
            value={filters.voidType}
            onChange={(e) => setFilters({ ...filters, voidType: e.target.value })}
          >
            <option value="all">Tous</option>
            <option value="line">Lignes</option>
            <option value="ticket">Tickets</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Du:</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label>Au:</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label>Point de vente:</label>
          <select
            value={filters.salesPoint}
            onChange={(e) => setFilters({ ...filters, salesPoint: e.target.value })}
          >
            <option value="all">Tous</option>
            {salesPoints.map(sp => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </select>
        </div>

        <button className="btn-reset" onClick={() => setFilters({
          voidType: 'all',
          dateFrom: '',
          dateTo: '',
          salesPoint: 'all'
        })}>
          Réinitialiser
        </button>
      </div>

      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-label">Total annulations</div>
          <div className="stat-value">{logs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Lignes annulées</div>
          <div className="stat-value">{logs.filter(l => l.void_type === 'line').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tickets annulés</div>
          <div className="stat-value">{logs.filter(l => l.void_type === 'ticket').length}</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-label">Montant total annulé</div>
          <div className="stat-value">{getTotalVoided().toFixed(0)} FCFA</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="no-data">Aucune annulation trouvée</div>
      ) : (
        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Date/Heure</th>
                <th>Type</th>
                <th>Point de vente</th>
                <th>Produits</th>
                <th>Montant</th>
                <th>Annulé par</th>
                <th>Raison</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.voided_at).toLocaleString('fr-FR')}</td>
                  <td>
                    <span className={`badge badge-${log.void_type}`}>
                      {log.void_type === 'line' ? 'Ligne' : 'Ticket'}
                    </span>
                  </td>
                  <td>{log.sales_points?.name || 'N/A'}</td>
                  <td className="products-cell">
                    {getProductsDisplay(log.product_details)}
                  </td>
                  <td className="amount-cell">{parseFloat(log.amount_voided).toFixed(0)} FCFA</td>
                  <td>{log.employees?.full_name || 'N/A'}</td>
                  <td className="reason-cell">{log.void_reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
