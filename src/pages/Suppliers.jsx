import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Suppliers.css';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    supplier_code: '',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms_id: '',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    loadSuppliers();
    loadPaymentTerms();
  }, []);

  async function loadPaymentTerms() {
    try {
      const { data, error } = await supabase
        .from('supplier_payment_terms')
        .select('*')
        .eq('active', true)
        .order('days', { ascending: true });

      if (error) throw error;
      setPaymentTerms(data || []);
    } catch (error) {
      console.error('Erreur chargement conditions paiement:', error);
    }
  }

  function calculateDueDate(receptionDate, paymentTerms) {
    if (!paymentTerms || !receptionDate) return null;

    const date = new Date(receptionDate);
    const terms = paymentTerms.toLowerCase();

    if (terms.includes('fin de mois')) {
      const days = parseInt(terms.match(/\d+/)?.[0] || 30);
      date.setMonth(date.getMonth() + 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth(), 0);
      return lastDay;
    }

    if (terms.includes('jours')) {
      const days = parseInt(terms.match(/\d+/)?.[0] || 30);
      date.setDate(date.getDate() + days);
      return date;
    }

    date.setDate(date.getDate() + 30);
    return date;
  }

  async function loadSuppliers() {
    try {
      setLoading(true);

      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*, supplier_payment_terms(name, days)')
        .order('supplier_code', { ascending: true });

      if (suppliersError) throw suppliersError;

      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('id, supplier_id, total_with_vat, status')
        .in('status', ['sent', 'partially_received']);

      if (ordersError) throw ordersError;

      const { data: receptionsData, error: receptionsError } = await supabase
        .from('purchase_receptions')
        .select('id, purchase_order_id, reception_date, status')
        .eq('status', 'completed');

      if (receptionsError) throw receptionsError;

      const suppliersWithBalances = suppliersData.map(supplier => {
        const supplierOrders = ordersData.filter(o => o.supplier_id === supplier.id);

        const totalDue = supplierOrders.reduce((sum, order) => {
          return sum + parseFloat(order.total_with_vat || 0);
        }, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueAmount = supplierOrders.reduce((sum, order) => {
          const orderReceptions = receptionsData.filter(r => r.purchase_order_id === order.id);

          if (orderReceptions.length > 0) {
            const latestReception = orderReceptions.sort((a, b) =>
              new Date(b.reception_date) - new Date(a.reception_date)
            )[0];

            const dueDate = calculateDueDate(latestReception.reception_date, supplier.supplier_payment_terms?.name || supplier.payment_terms);
            if (dueDate) {
              dueDate.setHours(0, 0, 0, 0);
              if (dueDate < today) {
                return sum + parseFloat(order.total_with_vat || 0);
              }
            }
          }
          return sum;
        }, 0);

        return {
          ...supplier,
          total_due: totalDue,
          overdue_amount: overdueAmount,
          pending_orders: supplierOrders.length
        };
      });

      setSuppliers(suppliersWithBalances || []);
    } catch (error) {
      console.error('Erreur chargement fournisseurs:', error);
      alert('Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.supplier_code.trim() || !formData.name.trim()) {
      alert('Le code fournisseur et le nom sont obligatoires');
      return;
    }

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSupplier.id);

        if (error) throw error;
        alert('Fournisseur modifié avec succès');
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([formData]);

        if (error) throw error;
        alert('Fournisseur créé avec succès');
      }

      resetForm();
      loadSuppliers();
    } catch (error) {
      console.error('Erreur sauvegarde fournisseur:', error);
      alert('Erreur: ' + error.message);
    }
  }

  function editSupplier(supplier) {
    setEditingSupplier(supplier);
    setFormData({
      supplier_code: supplier.supplier_code,
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      payment_terms_id: supplier.payment_terms_id || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active
    });
    setShowForm(true);
  }

  async function deleteSupplier(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Fournisseur supprimé');
      loadSuppliers();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Impossible de supprimer ce fournisseur (commandes associées)');
    }
  }

  function resetForm() {
    setFormData({
      supplier_code: '',
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_terms_id: '',
      notes: '',
      is_active: true
    });
    setEditingSupplier(null);
    setShowForm(false);
  }

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.supplier_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="suppliers-page">
      <div className="page-header">
        <h1>Gestion des Fournisseurs</h1>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Annuler' : '+ Nouveau Fournisseur'}
        </button>
      </div>

      {showForm && (
        <div className="supplier-form-container">
          <h2>{editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
          <form onSubmit={handleSubmit} className="supplier-form">
            <div className="form-row">
              <div className="form-group">
                <label>Code Fournisseur *</label>
                <input
                  type="text"
                  name="supplier_code"
                  value={formData.supplier_code}
                  onChange={handleInputChange}
                  placeholder="F001"
                  required
                  disabled={editingSupplier}
                />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nom du fournisseur"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Personne de contact</label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contact@fournisseur.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
              <div className="form-group">
                <label>Conditions de paiement *</label>
                <select
                  name="payment_terms_id"
                  value={formData.payment_terms_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Sélectionner...</option>
                  {paymentTerms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Adresse</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Adresse complète"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Notes diverses"
                rows="3"
              />
            </div>

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />
                <span>Fournisseur actif</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn-primary">
                {editingSupplier ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="suppliers-list-container">
        <div className="list-header">
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="summary-info">
            <span className="info-badge total">Total dû: {filteredSuppliers.reduce((sum, s) => sum + (s.total_due || 0), 0).toLocaleString()} FCFA</span>
            <span className="info-badge overdue">Échu: {filteredSuppliers.reduce((sum, s) => sum + (s.overdue_amount || 0), 0).toLocaleString()} FCFA</span>
            <span className="count-badge">{filteredSuppliers.length} fournisseur(s)</span>
          </div>
        </div>

        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="suppliers-table-wrapper">
            <table className="suppliers-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Nom</th>
                  <th>Contact</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th>Conditions paiement</th>
                  <th>Total dû</th>
                  <th>Échu</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className={!supplier.is_active ? 'inactive-row' : ''}>
                    <td className="supplier-code">{supplier.supplier_code}</td>
                    <td className="supplier-name">{supplier.name}</td>
                    <td>{supplier.contact_person || '-'}</td>
                    <td>{supplier.phone || '-'}</td>
                    <td className="email-cell">{supplier.email || '-'}</td>
                    <td className="payment-terms">{supplier.supplier_payment_terms?.name || supplier.payment_terms || '-'}</td>
                    <td className="amount">{(supplier.total_due || 0).toLocaleString()} FCFA</td>
                    <td className={`amount ${supplier.overdue_amount > 0 ? 'overdue' : ''}`}>
                      {supplier.overdue_amount > 0 ? `${supplier.overdue_amount.toLocaleString()} FCFA` : '-'}
                    </td>
                    <td>
                      <span className={`status-badge ${supplier.is_active ? 'active' : 'inactive'}`}>
                        {supplier.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="btn-edit" onClick={() => editSupplier(supplier)}>Modifier</button>
                      <button className="btn-delete" onClick={() => deleteSupplier(supplier.id)}>Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSuppliers.length === 0 && (
              <div className="empty-state">
                {searchTerm ? 'Aucun fournisseur trouvé' : 'Aucun fournisseur créé'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
