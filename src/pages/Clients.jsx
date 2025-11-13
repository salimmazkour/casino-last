import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import './Clients.css';

export default function Clients() {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortField, setSortField] = useState('client_number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientOrders, setClientOrders] = useState([]);
  const [clientPayments, setClientPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentType, setPaymentType] = useState('invoice_payment');
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [invoiceAllocations, setInvoiceAllocations] = useState({});
  const [salesPoints, setSalesPoints] = useState([]);
  const [selectedSalesPoint, setSelectedSalesPoint] = useState('');
  const [formData, setFormData] = useState({
    type: 'individual',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    phone_secondary: '',
    address: '',
    city: 'Dakar',
    country: 'Sénégal',
    nationality: '',
    tax_id: '',
    credit_limit: 0,
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    loadClients();
    loadSalesPoints();
  }, []);

  const loadSalesPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_points')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSalesPoints(data || []);
    } catch (error) {
      console.error('Erreur chargement points de vente:', error);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const clientData = {
        ...formData,
        credit_limit: parseFloat(formData.credit_limit) || 0,
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([clientData]);
        if (error) throw error;
      }

      resetForm();
      loadClients();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      type: client.type,
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      company_name: client.company_name || '',
      email: client.email || '',
      phone: client.phone,
      phone_secondary: client.phone_secondary || '',
      address: client.address || '',
      city: client.city || 'Dakar',
      country: client.country || 'Sénégal',
      nationality: client.nationality || '',
      tax_id: client.tax_id || '',
      credit_limit: client.credit_limit || 0,
      is_active: client.is_active,
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce client ?')) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      loadClients();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'individual',
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
      phone_secondary: '',
      address: '',
      city: 'Dakar',
      country: 'Sénégal',
      nationality: '',
      tax_id: '',
      credit_limit: 0,
      is_active: true,
      notes: '',
    });
    setEditingClient(null);
    setShowModal(false);
  };

  const getClientName = (client) => {
    if (client.type === 'company') {
      return client.company_name;
    }
    return `${client.first_name} ${client.last_name}`;
  };

  const viewClientDetails = async (client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(name)),
          payments(*)
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setClientOrders(ordersData || []);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('client_payments')
        .select(`
          *,
          sales_points(name),
          payment_invoice_allocations(
            allocated_amount,
            orders(order_number, total_amount)
          )
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setClientPayments(paymentsData || []);
    } catch (error) {
      console.error('Erreur chargement données client:', error);
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Veuillez saisir un montant valide');
      return;
    }

    if (!selectedSalesPoint) {
      alert('Veuillez sélectionner une caisse');
      return;
    }

    if (paymentType === 'invoice_payment' && selectedInvoices.length === 0) {
      alert('Veuillez sélectionner au moins une facture à régler');
      return;
    }

    try {
      const amount = parseFloat(paymentAmount);

      let totalAllocated = 0;
      if (paymentType === 'invoice_payment') {
        totalAllocated = Object.values(invoiceAllocations).reduce((sum, val) => sum + parseFloat(val || 0), 0);
        if (totalAllocated > amount) {
          alert('Le total des montants alloués dépasse le montant du paiement');
          return;
        }
      }

      const currentBalance = parseFloat(selectedClient.current_balance);
      const newBalance = currentBalance + amount;

      const { error: updateError } = await supabase
        .from('clients')
        .update({ current_balance: newBalance })
        .eq('id', selectedClient.id);

      if (updateError) throw updateError;

      const { data: paymentData, error: paymentError } = await supabase
        .from('client_payments')
        .insert({
          client_id: selectedClient.id,
          amount: amount,
          payment_method: paymentMethod,
          reference: paymentReference || null,
          notes: paymentNotes || null,
          created_by: 'admin',
          payment_type: paymentType,
          allocated_amount: paymentType === 'invoice_payment' ? totalAllocated : 0,
          remaining_amount: paymentType === 'invoice_payment' ? amount - totalAllocated : amount,
          sales_point_id: selectedSalesPoint
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      const { error: posPaymentError } = await supabase
        .from('payments')
        .insert({
          order_id: null,
          sales_point_id: selectedSalesPoint,
          payment_method: paymentMethod,
          amount: amount,
          reference: paymentReference || null,
          notes: `Paiement client: ${selectedClient.type === 'company' ? selectedClient.company_name : `${selectedClient.first_name} ${selectedClient.last_name}`}${paymentNotes ? ' - ' + paymentNotes : ''}`,
          created_by: 'admin'
        });

      if (posPaymentError) throw posPaymentError;

      if (paymentType === 'invoice_payment' && selectedInvoices.length > 0) {
        const allocations = selectedInvoices.map(orderId => ({
          payment_id: paymentData.id,
          order_id: orderId,
          allocated_amount: parseFloat(invoiceAllocations[orderId] || 0)
        }));

        const { error: allocError } = await supabase
          .from('payment_invoice_allocations')
          .insert(allocations);

        if (allocError) throw allocError;

        for (const orderId of selectedInvoices) {
          const allocatedAmount = parseFloat(invoiceAllocations[orderId] || 0);
          const order = clientOrders.find(o => o.id === orderId);
          if (order) {
            const newPaidAmount = (parseFloat(order.paid_amount) || 0) + allocatedAmount;
            const newRemainingAmount = parseFloat(order.total_amount) - newPaidAmount;
            const newPaymentStatus = newRemainingAmount <= 0 ? 'paid' : 'partial';

            await supabase
              .from('orders')
              .update({
                paid_amount: newPaidAmount,
                remaining_amount: newRemainingAmount,
                payment_status: newPaymentStatus
              })
              .eq('id', orderId);
          }
        }
      }

      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentReference('');
      setPaymentNotes('');
      setPaymentType('invoice_payment');
      setSelectedInvoices([]);
      setInvoiceAllocations({});
      setSelectedSalesPoint('');
      setShowPaymentModal(false);
      loadClients();

      if (selectedClient) {
        const updatedClient = { ...selectedClient, current_balance: newBalance };
        setSelectedClient(updatedClient);
        viewClientDetails(updatedClient);
      }

      alert('Paiement enregistré avec succès !');
    } catch (error) {
      console.error('Erreur enregistrement paiement:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const getCreditAvailable = (client) => {
    return parseFloat(client.credit_limit) + parseFloat(client.current_balance);
  };

  const isClientBlocked = (client) => {
    return getCreditAvailable(client) <= 0 || !client.is_active;
  };

  const toggleInvoiceSelection = (orderId) => {
    if (selectedInvoices.includes(orderId)) {
      setSelectedInvoices(selectedInvoices.filter(id => id !== orderId));
      const newAllocations = { ...invoiceAllocations };
      delete newAllocations[orderId];
      setInvoiceAllocations(newAllocations);
    } else {
      setSelectedInvoices([...selectedInvoices, orderId]);
      const order = clientOrders.find(o => o.id === orderId);
      if (order) {
        setInvoiceAllocations({
          ...invoiceAllocations,
          [orderId]: order.remaining_amount || order.total_amount
        });
      }
    }
  };

  const updateAllocation = (orderId, amount) => {
    setInvoiceAllocations({
      ...invoiceAllocations,
      [orderId]: amount
    });
  };

  const getTotalAllocated = () => {
    return Object.values(invoiceAllocations).reduce((sum, val) => sum + parseFloat(val || 0), 0);
  };

  const handleDeallocatePayment = async (payment) => {
    if (!confirm('Voulez-vous vraiment désallouer ce paiement ? Les factures reviendront à leur statut précédent.')) {
      return;
    }

    try {
      const allocations = payment.payment_invoice_allocations || [];

      for (const alloc of allocations) {
        const { data: orderData, error: fetchError } = await supabase
          .from('orders')
          .select('paid_amount, remaining_amount, total_amount')
          .eq('id', alloc.order_id)
          .single();

        if (fetchError) throw fetchError;

        const newPaidAmount = (parseFloat(orderData.paid_amount) || 0) - parseFloat(alloc.allocated_amount);
        const newRemainingAmount = parseFloat(orderData.total_amount) - newPaidAmount;
        const newPaymentStatus = newPaidAmount <= 0 ? 'pending' : 'partial';

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            paid_amount: newPaidAmount,
            remaining_amount: newRemainingAmount,
            payment_status: newPaymentStatus
          })
          .eq('id', alloc.order_id);

        if (updateError) throw updateError;
      }

      const { error: deleteError } = await supabase
        .from('payment_invoice_allocations')
        .delete()
        .eq('payment_id', payment.id);

      if (deleteError) throw deleteError;

      const { error: updatePaymentError } = await supabase
        .from('client_payments')
        .update({
          payment_type: 'deposit',
          allocated_amount: 0,
          remaining_amount: payment.amount
        })
        .eq('id', payment.id);

      if (updatePaymentError) throw updatePaymentError;

      alert('Paiement désalloué avec succès. Il est maintenant considéré comme un dépôt libre.');
      viewClientDetails(selectedClient);
    } catch (error) {
      console.error('Erreur lors de la désallocation:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const getPendingInvoices = () => {
    return clientOrders.filter(order =>
      order.payment_status === 'pending' || order.payment_status === 'partial'
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredClients = clients
    .filter(client => {
      const matchesSearch = getClientName(client).toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.client_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || client.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      if (sortField === 'display_name') {
        aValue = getClientName(a);
        bValue = getClientName(b);
      } else if (sortField === 'balance' || sortField === 'credit_limit') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="clients-container">
      <div className="page-header">
        <h2>Gestion des Clients</h2>
        {canCreate('clients') && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Nouveau Client
          </button>
        )}
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Rechercher par nom, numéro ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">Tous les types</option>
          <option value="individual">Particuliers</option>
          <option value="company">Sociétés</option>
        </select>
      </div>

      <div className="clients-table-container">
        <table className="clients-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('client_number')} style={{ cursor: 'pointer' }}>
                N° Client {sortField === 'client_number' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('display_name')} style={{ cursor: 'pointer' }}>
                Nom / Raison sociale {sortField === 'display_name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                Type {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer' }}>
                Contact {sortField === 'phone' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('city')} style={{ cursor: 'pointer' }}>
                Ville {sortField === 'city' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('credit_limit')} style={{ cursor: 'pointer' }}>
                Crédit autorisé {sortField === 'credit_limit' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('balance')} style={{ cursor: 'pointer' }}>
                Solde {sortField === 'balance' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Crédit disponible</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id} className={!client.is_active ? 'inactive-row' : ''}>
                <td className="client-number">{client.client_number}</td>
                <td className="client-name">
                  <strong>{getClientName(client)}</strong>
                  {client.email && <div className="client-email">{client.email}</div>}
                </td>
                <td>
                  <span className={`type-badge ${client.type}`}>
                    {client.type === 'individual' ? 'Particulier' : 'Société'}
                  </span>
                </td>
                <td>
                  <div>{client.phone}</div>
                  {client.phone_secondary && <div className="secondary-phone">{client.phone_secondary}</div>}
                </td>
                <td>{client.city}</td>
                <td className="amount">{parseInt(client.credit_limit).toLocaleString()} FCFA</td>
                <td className={`amount ${parseFloat(client.current_balance) < 0 ? 'negative' : 'positive'}`}>
                  {parseInt(client.current_balance).toLocaleString()} FCFA
                </td>
                <td className={`amount ${getCreditAvailable(client) <= 0 ? 'negative' : 'positive'}`}>
                  {parseInt(getCreditAvailable(client)).toLocaleString()} FCFA
                  {isClientBlocked(client) && <div className="blocked-badge">BLOQUÉ</div>}
                </td>
                <td>
                  <span className={`status-badge ${client.is_active ? 'active' : 'inactive'}`}>
                    {client.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button className="btn-view" onClick={() => viewClientDetails(client)}>
                    Détails
                  </button>
                  {canUpdate('clients') && (
                    <button className="btn-edit" onClick={() => handleEdit(client)}>
                      Modifier
                    </button>
                  )}
                  {canDelete('clients') && (
                    <button className="btn-delete" onClick={() => handleDelete(client.id)}>
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClient ? 'Modifier' : 'Nouveau'} Client</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Type de client *</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="type"
                      value="individual"
                      checked={formData.type === 'individual'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    />
                    <span>Particulier</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="type"
                      value="company"
                      checked={formData.type === 'company'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    />
                    <span>Société</span>
                  </label>
                </div>
              </div>

              {formData.type === 'individual' ? (
                <div className="form-row">
                  <div className="form-group">
                    <label>Prénom *</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Raison sociale *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Téléphone principal *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+221 77 123 45 67"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone secondaire</label>
                  <input
                    type="tel"
                    value={formData.phone_secondary}
                    onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
                    placeholder="+221 33 821 00 00"
                  />
                </div>
                <div className="form-group">
                  <label>NINEA / Numéro fiscal</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ville</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Pays</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Nationalité</label>
                <input
                  type="text"
                  placeholder="Nationalité (optionnel)"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Plafond de crédit (FCFA)</label>
                  <input
                    type="number"
                    step="1000"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  />
                  <small style={{color: '#6b7280', marginTop: '4px', display: 'block'}}>
                    Montant maximum que le client peut acheter à crédit
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>Notes internes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Client actif</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingClient ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Détails client - {getClientName(selectedClient)}</h3>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="client-details-content">
              <div className="client-summary">
                <div className="summary-card">
                  <div className="summary-label">Numéro client</div>
                  <div className="summary-value">{selectedClient.client_number}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Crédit autorisé</div>
                  <div className="summary-value">{parseInt(selectedClient.credit_limit).toLocaleString()} FCFA</div>
                </div>
                <div className={`summary-card ${parseFloat(selectedClient.current_balance) < 0 ? 'negative' : 'positive'}`}>
                  <div className="summary-label">
                    {parseFloat(selectedClient.current_balance) < 0 ? 'Dette actuelle' : 'Solde créditeur'}
                  </div>
                  <div className="summary-value">
                    {parseFloat(selectedClient.current_balance) < 0 ? '-' : '+'}{parseInt(Math.abs(selectedClient.current_balance)).toLocaleString()} FCFA
                  </div>
                </div>
                <div className={`summary-card ${getCreditAvailable(selectedClient) <= 0 ? 'negative' : 'positive'}`}>
                  <div className="summary-label">Crédit disponible</div>
                  <div className="summary-value">{parseInt(getCreditAvailable(selectedClient)).toLocaleString()} FCFA</div>
                </div>
              </div>

              {isClientBlocked(selectedClient) && (
                <div className="alert-warning">
                  ⚠️ Client bloqué - Crédit insuffisant ou compte inactif
                </div>
              )}

              <div className="details-actions">
                <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
                  Enregistrer un paiement
                </button>
              </div>

              <h4>Factures en attente de paiement</h4>
              <div className="orders-table-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>N° Commande</th>
                      <th>Date</th>
                      <th>Articles</th>
                      <th>Montant</th>
                      <th>Statut paiement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientOrders.filter(order => order.payment_status === 'pending').map(order => (
                      <tr key={order.id}>
                        <td className="order-number">{order.order_number}</td>
                        <td>{new Date(order.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                        <td>
                          {order.order_items.map((item, idx) => (
                            <div key={idx} className="order-item-line">
                              {item.quantity}x {item.products.name}
                            </div>
                          ))}
                        </td>
                        <td className="amount negative">{parseInt(order.total_amount).toLocaleString()} FCFA</td>
                        <td>
                          <span className="status-badge pending">En attente</span>
                        </td>
                      </tr>
                    ))}
                    {clientOrders.filter(order => order.payment_status === 'pending').length === 0 && (
                      <tr>
                        <td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>
                          Aucune facture en attente
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h4>Historique des paiements</h4>
              <div className="orders-table-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Caisse</th>
                      <th>Montant</th>
                      <th>Factures réglées</th>
                      <th>Mode de paiement</th>
                      <th>Référence</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientPayments.map(payment => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                        <td>
                          <span className={`status-badge ${payment.payment_type === 'deposit' ? 'pending' : 'active'}`}>
                            {payment.payment_type === 'deposit' ? 'Arrhes' : 'Règlement'}
                          </span>
                        </td>
                        <td>
                          <span className="status-badge" style={{backgroundColor: '#3b82f6'}}>
                            {payment.sales_points?.name || 'Non spécifié'}
                          </span>
                        </td>
                        <td className="amount positive">+{parseInt(payment.amount).toLocaleString()} FCFA</td>
                        <td>
                          {payment.payment_invoice_allocations && payment.payment_invoice_allocations.length > 0 ? (
                            <div>
                              {payment.payment_invoice_allocations.map((alloc, idx) => (
                                <div key={idx} style={{fontSize: '0.875rem'}}>
                                  {alloc.orders?.order_number}: {parseInt(alloc.allocated_amount).toLocaleString()} FCFA
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{color: '#6b7280'}}>-</span>
                          )}
                        </td>
                        <td>
                          <span className="status-badge active">{payment.payment_method}</span>
                        </td>
                        <td>{payment.reference || '-'}</td>
                        <td>
                          {payment.payment_type === 'invoice_payment' && payment.payment_invoice_allocations?.length > 0 && (
                            <button
                              className="btn-delete"
                              onClick={() => handleDeallocatePayment(payment)}
                              style={{fontSize: '0.75rem', padding: '0.25rem 0.5rem'}}
                            >
                              Désallouer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {clientPayments.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>
                          Aucun paiement enregistré
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h4>Historique des commandes</h4>
              <div className="orders-table-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>N° Commande</th>
                      <th>Date</th>
                      <th>Articles</th>
                      <th>Montant total</th>
                      <th>Payé</th>
                      <th>Reste</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientOrders.slice(0, 10).map(order => (
                      <tr key={order.id}>
                        <td className="order-number">{order.order_number}</td>
                        <td>{new Date(order.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                        <td>
                          {order.order_items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="order-item-line">
                              {item.quantity}x {item.products.name}
                            </div>
                          ))}
                          {order.order_items.length > 3 && (
                            <div className="more-items">+{order.order_items.length - 3} autres</div>
                          )}
                        </td>
                        <td className="amount">{parseInt(order.total_amount).toLocaleString()} FCFA</td>
                        <td className="amount positive">{parseInt(order.paid_amount || 0).toLocaleString()} FCFA</td>
                        <td className="amount negative">{parseInt(order.remaining_amount || order.total_amount).toLocaleString()} FCFA</td>
                        <td>
                          <span className={`status-badge ${order.payment_status === 'paid' ? 'active' : order.payment_status === 'partial' ? 'warning' : 'pending'}`}>
                            {order.payment_status === 'paid' ? 'Payé' : order.payment_status === 'partial' ? 'Partiel' : 'En attente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Enregistrer un paiement</h3>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>

            <div style={{padding: '1.5rem'}}>
              <div className="payment-info">
                <p><strong>Client:</strong> {getClientName(selectedClient)}</p>
                <p><strong>Dette actuelle:</strong> <span className="amount negative">{parseInt(Math.abs(selectedClient.current_balance)).toLocaleString()} FCFA</span></p>
              </div>

              <div className="form-group">
                <label>Type de paiement *</label>
                <select
                  value={paymentType}
                  onChange={(e) => {
                    setPaymentType(e.target.value);
                    setSelectedInvoices([]);
                    setInvoiceAllocations({});
                  }}
                >
                  <option value="invoice_payment">Règlement de facture(s)</option>
                  <option value="deposit">Dépôt libre (arrhes)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Montant du paiement (FCFA) *</label>
                <input
                  type="number"
                  step="100"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Montant à encaisser"
                  autoFocus
                />
              </div>

              {paymentType === 'invoice_payment' && (
                <div className="form-group">
                  <label>Sélectionner les factures à régler</label>
                  <div className="invoice-selection" style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem'}}>
                    {getPendingInvoices().length === 0 ? (
                      <p style={{textAlign: 'center', color: '#6b7280', padding: '1rem'}}>
                        Aucune facture en attente
                      </p>
                    ) : (
                      getPendingInvoices().map(order => (
                        <div key={order.id} style={{marginBottom: '1rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: selectedInvoices.includes(order.id) ? '#f0f9ff' : 'white'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                            <input
                              type="checkbox"
                              checked={selectedInvoices.includes(order.id)}
                              onChange={() => toggleInvoiceSelection(order.id)}
                            />
                            <div style={{flex: 1}}>
                              <div style={{fontWeight: 'bold'}}>{order.order_number}</div>
                              <div style={{fontSize: '0.875rem', color: '#6b7280'}}>
                                {new Date(order.created_at).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                            <div style={{textAlign: 'right'}}>
                              <div style={{fontWeight: 'bold'}}>{parseInt(order.total_amount).toLocaleString()} FCFA</div>
                              <div style={{fontSize: '0.875rem', color: '#ef4444'}}>
                                Reste: {parseInt(order.remaining_amount || order.total_amount).toLocaleString()} FCFA
                              </div>
                            </div>
                          </div>
                          {selectedInvoices.includes(order.id) && (
                            <div style={{marginTop: '0.5rem'}}>
                              <label style={{fontSize: '0.875rem', color: '#6b7280'}}>Montant à allouer:</label>
                              <input
                                type="number"
                                step="100"
                                value={invoiceAllocations[order.id] || ''}
                                onChange={(e) => updateAllocation(order.id, e.target.value)}
                                placeholder="0"
                                style={{width: '100%', marginTop: '0.25rem'}}
                              />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {selectedInvoices.length > 0 && (
                    <div style={{marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '4px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
                        <span>Total alloué:</span>
                        <span>{getTotalAllocated().toLocaleString()} FCFA</span>
                      </div>
                      {paymentAmount && getTotalAllocated() > parseFloat(paymentAmount) && (
                        <div style={{color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem'}}>
                          ⚠️ Le total alloué dépasse le montant du paiement
                        </div>
                      )}
                      {paymentAmount && getTotalAllocated() < parseFloat(paymentAmount) && getTotalAllocated() > 0 && (
                        <div style={{color: '#f59e0b', fontSize: '0.875rem', marginTop: '0.5rem'}}>
                          ℹ️ Sous-paiement : {(parseFloat(paymentAmount) - getTotalAllocated()).toLocaleString()} FCFA seront ajoutés au solde créditeur
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Caisse / Point de vente *</label>
                <select
                  value={selectedSalesPoint}
                  onChange={(e) => setSelectedSalesPoint(e.target.value)}
                >
                  <option value="">-- Sélectionner une caisse --</option>
                  {salesPoints.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Mode de paiement *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Espèces</option>
                  <option value="card">Carte bancaire</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="wave">Wave</option>
                </select>
              </div>

              <div className="form-group">
                <label>Référence / N° de transaction</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ex: Reçu N°12345, Ref. virement..."
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Notes additionnelles..."
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Annuler
                </button>
                <button type="button" className="btn-primary" onClick={handlePayment}>
                  Enregistrer le paiement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
