import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './TableManagement.css';

export default function TableManagement({ salesPoint, onClose, onSelectTable, standalone = false }) {
  const location = useLocation();
  const [tables, setTables] = useState([]);
  const [viewMode, setViewMode] = useState('graphical');
  const [selectedTable, setSelectedTable] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferReason, setTransferReason] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedTablesToMerge, setSelectedTablesToMerge] = useState([]);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [tableToSplit, setTableToSplit] = useState(null);
  const [splitOrderItems, setSplitOrderItems] = useState([]);
  const [itemsDistribution, setItemsDistribution] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [tableToEdit, setTableToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    table_number: '',
    capacity: '',
    zone: '',
    position_x: '',
    position_y: ''
  });
  const [selectedSalesPoint, setSelectedSalesPoint] = useState(null);
  const [salesPoints, setSalesPoints] = useState([]);
  const [sortField, setSortField] = useState('table_number');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    if (standalone) {
      loadSalesPoints();
    } else if (salesPoint) {
      loadTables();
    }
  }, [salesPoint, standalone]);

  useEffect(() => {
    if (selectedSalesPoint) {
      loadTables();
    }
  }, [selectedSalesPoint]);

  const loadSalesPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_points')
        .select('*')
        .order('name');

      if (error) throw error;
      setSalesPoints(data || []);

      const passedSalesPointId = location.state?.salesPointId;
      if (passedSalesPointId) {
        setSelectedSalesPoint(passedSalesPointId);
      } else if (data && data.length > 0) {
        setSelectedSalesPoint(data[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement points de vente:', error);
    }
  };

  const loadTables = async () => {
    try {
      const pointId = standalone ? selectedSalesPoint : salesPoint?.id;
      if (!pointId) return;

      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('sales_point_id', pointId)
        .order('table_number');

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Erreur chargement tables:', error);
    }
  };

  const getTableColor = (status) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'occupied': return '#ef4444';
      case 'reserved': return '#f59e0b';
      case 'merged': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'occupied': return 'Occupée';
      case 'reserved': return 'Réservée';
      case 'merged': return 'Fusionnée';
      default: return status;
    }
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
    if (table.status === 'occupied' && table.current_order_id) {
      onSelectTable(table);
    }
  };

  const openTransferModal = (table) => {
    setSelectedTable(table);
    setShowTransferModal(true);
  };

  const handleTransfer = async () => {
    if (!transferTarget || !transferReason.trim()) {
      alert('Veuillez sélectionner une table de destination et fournir une raison');
      return;
    }

    try {
      const { error: transferError } = await supabase
        .from('table_transfers')
        .insert({
          from_table_id: selectedTable.id,
          to_table_id: transferTarget,
          order_id: selectedTable.current_order_id,
          reason: transferReason
        });

      if (transferError) throw transferError;

      const { error: updateFromError } = await supabase
        .from('restaurant_tables')
        .update({
          status: 'available',
          current_order_id: null
        })
        .eq('id', selectedTable.id);

      if (updateFromError) throw updateFromError;

      const { error: updateToError } = await supabase
        .from('restaurant_tables')
        .update({
          status: 'occupied',
          current_order_id: selectedTable.current_order_id
        })
        .eq('id', transferTarget);

      if (updateToError) throw updateToError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({ table_id: transferTarget })
        .eq('id', selectedTable.current_order_id);

      if (orderError) throw orderError;

      setShowTransferModal(false);
      setTransferTarget(null);
      setTransferReason('');
      loadTables();
      alert('Transfert effectué avec succès');
    } catch (error) {
      console.error('Erreur transfert:', error);
      alert('Erreur lors du transfert: ' + error.message);
    }
  };

  const handleMergeTables = async () => {
    if (selectedTablesToMerge.length < 2) {
      alert('Veuillez sélectionner au moins 2 tables à fusionner');
      return;
    }

    try {
      const primaryTable = tables.find(t => t.id === selectedTablesToMerge[0]);
      const otherTableIds = selectedTablesToMerge.slice(1);
      const otherTables = tables.filter(t => otherTableIds.includes(t.id));

      let totalGuests = primaryTable.current_guests || 0;
      const ordersToMerge = [];

      for (const table of otherTables) {
        totalGuests += table.current_guests || 0;

        if (table.status === 'occupied' && table.current_order_id) {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', table.current_order_id);

          if (orderItems && orderItems.length > 0) {
            ordersToMerge.push({
              orderId: table.current_order_id,
              items: orderItems,
              tableNumber: table.table_number
            });
          }
        }
      }

      let primaryOrderId = primaryTable.current_order_id;

      if (ordersToMerge.length > 0) {
        if (!primaryOrderId && primaryTable.status === 'available') {
          const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
              sales_point_id: salesPoint.id,
              table_id: primaryTable.id,
              order_type: 'dine_in',
              guest_count: totalGuests,
              status: 'pending',
              total_amount: 0,
              tax_amount: 0,
              subtotal: 0
            })
            .select()
            .single();

          if (orderError) throw orderError;
          primaryOrderId = newOrder.id;
        }

        for (const orderData of ordersToMerge) {
          for (const item of orderData.items) {
            await supabase
              .from('order_items')
              .update({ order_id: primaryOrderId })
              .eq('id', item.id);
          }

          await supabase
            .from('orders')
            .update({ status: 'merged' })
            .eq('id', orderData.orderId);
        }

        const { data: allItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', primaryOrderId);

        const newSubtotal = allItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const taxRate = salesPoint.vat_rate || 0.10;
        const newTaxAmount = newSubtotal * taxRate;
        const newTotal = newSubtotal + newTaxAmount;

        await supabase
          .from('orders')
          .update({
            subtotal: newSubtotal,
            tax_amount: newTaxAmount,
            total_amount: newTotal,
            guest_count: totalGuests
          })
          .eq('id', primaryOrderId);
      }

      await supabase
        .from('restaurant_tables')
        .update({
          status: ordersToMerge.length > 0 || primaryTable.status === 'occupied' ? 'occupied' : 'merged',
          merged_with: otherTableIds,
          current_order_id: primaryOrderId,
          current_guests: totalGuests
        })
        .eq('id', primaryTable.id);

      for (const tableId of otherTableIds) {
        await supabase
          .from('restaurant_tables')
          .update({
            status: 'merged',
            merged_with: [primaryTable.id],
            current_order_id: null,
            current_guests: 0
          })
          .eq('id', tableId);
      }

      setShowMergeModal(false);
      setSelectedTablesToMerge([]);
      loadTables();

      const mergeMessage = ordersToMerge.length > 0
        ? `Tables fusionnées avec succès. ${ordersToMerge.length} commande(s) transférée(s) vers la table ${primaryTable.table_number}.`
        : `Tables fusionnées avec succès. Table principale: ${primaryTable.table_number}`;

      alert(mergeMessage);
    } catch (error) {
      console.error('Erreur fusion:', error);
      alert('Erreur lors de la fusion: ' + error.message);
    }
  };

  const openSplitModal = async (table) => {
    setTableToSplit(table);

    if (table.current_order_id) {
      const { data: items } = await supabase
        .from('order_items')
        .select(`
          *,
          products (name)
        `)
        .eq('order_id', table.current_order_id);

      setSplitOrderItems(items || []);

      const distribution = {};
      items?.forEach(item => {
        distribution[item.id] = table.id;
      });
      setItemsDistribution(distribution);
    }

    setShowSplitModal(true);
  };

  const handleSplitTable = async () => {
    if (!tableToSplit) return;

    try {
      const mergedWith = tableToSplit.merged_with || [];
      const hasActiveOrder = tableToSplit.current_order_id && splitOrderItems.length > 0;

      const tablesInvolved = [tableToSplit.id, ...mergedWith];
      const itemsByTable = {};

      tablesInvolved.forEach(tableId => {
        itemsByTable[tableId] = [];
      });

      if (hasActiveOrder) {
        splitOrderItems.forEach(item => {
          const assignedTableId = itemsDistribution[item.id];
          if (assignedTableId && itemsByTable[assignedTableId]) {
            itemsByTable[assignedTableId].push(item);
          }
        });

        for (const [tableId, items] of Object.entries(itemsByTable)) {
          if (items.length === 0) continue;

          if (tableId === tableToSplit.id) {
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            const taxRate = salesPoint.vat_rate || 0.10;
            const taxAmount = subtotal * taxRate;
            const total = subtotal + taxAmount;

            await supabase
              .from('orders')
              .update({
                subtotal,
                tax_amount: taxAmount,
                total_amount: total
              })
              .eq('id', tableToSplit.current_order_id);
          } else {
            const { data: newOrder, error: orderError } = await supabase
              .from('orders')
              .insert({
                sales_point_id: salesPoint.id,
                table_id: tableId,
                order_type: 'dine_in',
                guest_count: 0,
                status: 'pending',
                total_amount: 0,
                tax_amount: 0,
                subtotal: 0
              })
              .select()
              .single();

            if (orderError) throw orderError;

            const itemsToMove = items.map(item => item.id);
            await supabase
              .from('order_items')
              .update({ order_id: newOrder.id })
              .in('id', itemsToMove);

            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
            const taxRate = salesPoint.vat_rate || 0.10;
            const taxAmount = subtotal * taxRate;
            const total = subtotal + taxAmount;

            await supabase
              .from('orders')
              .update({
                subtotal,
                tax_amount: taxAmount,
                total_amount: total
              })
              .eq('id', newOrder.id);

            await supabase
              .from('restaurant_tables')
              .update({
                status: 'occupied',
                current_order_id: newOrder.id
              })
              .eq('id', tableId);
          }
        }
      }

      await supabase
        .from('restaurant_tables')
        .update({
          status: hasActiveOrder ? 'occupied' : 'available',
          merged_with: null
        })
        .eq('id', tableToSplit.id);

      for (const tableId of mergedWith) {
        const hasItems = hasActiveOrder && itemsByTable[tableId]?.length > 0;
        await supabase
          .from('restaurant_tables')
          .update({
            status: hasItems ? 'occupied' : 'available',
            merged_with: null
          })
          .eq('id', tableId);
      }

      setShowSplitModal(false);
      setTableToSplit(null);
      setSplitOrderItems([]);
      setItemsDistribution({});
      loadTables();
      alert('Tables séparées avec succès');
    } catch (error) {
      console.error('Erreur séparation:', error);
      alert('Erreur lors de la séparation: ' + error.message);
    }
  };

  const toggleTableSelection = (tableId) => {
    if (selectedTablesToMerge.includes(tableId)) {
      setSelectedTablesToMerge(selectedTablesToMerge.filter(id => id !== tableId));
    } else {
      setSelectedTablesToMerge([...selectedTablesToMerge, tableId]);
    }
  };

  const openEditModal = (table) => {
    setTableToEdit(table);
    setEditForm({
      table_number: table.table_number,
      capacity: table.capacity,
      zone: table.zone,
      position_x: table.position_x,
      position_y: table.position_y
    });
    setShowEditModal(true);
  };

  const handleEditTable = async () => {
    if (!tableToEdit) return;

    if (!editForm.table_number.trim()) {
      alert('Le numéro de table est obligatoire');
      return;
    }

    if (!editForm.capacity || editForm.capacity < 1) {
      alert('La capacité doit être au moins 1');
      return;
    }

    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({
          table_number: editForm.table_number.trim(),
          capacity: parseInt(editForm.capacity),
          zone: editForm.zone.trim(),
          position_x: parseInt(editForm.position_x) || 0,
          position_y: parseInt(editForm.position_y) || 0
        })
        .eq('id', tableToEdit.id);

      if (error) throw error;

      setShowEditModal(false);
      setTableToEdit(null);
      setEditForm({
        table_number: '',
        capacity: '',
        zone: '',
        position_x: '',
        position_y: ''
      });
      loadTables();
      alert('Table modifiée avec succès');
    } catch (error) {
      console.error('Erreur modification:', error);
      alert('Erreur lors de la modification: ' + error.message);
    }
  };

  const zones = [...new Set(tables.map(t => t.zone))];
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredTables = tables
    .filter(t => {
      if (filterZone !== 'all' && t.zone !== filterZone) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      if (sortField === 'table_number') {
        const aNum = parseInt(aValue.replace(/\D/g, '')) || 0;
        const bNum = parseInt(bValue.replace(/\D/g, '')) || 0;
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      } else if (sortField === 'capacity') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const containerClass = standalone ? "table-management-standalone" : "table-management-overlay";
  const innerClass = standalone ? "table-management-content" : "table-management-container";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        {!standalone && (
          <div className="table-management-header">
            <h2>Gestion des Tables - {salesPoint?.name}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        )}

        {standalone && (
          <div className="standalone-header">
            <h2>Gestion des Tables</h2>
            <div className="sales-points-tabs">
              {salesPoints.map(sp => (
                <button
                  key={sp.id}
                  className={selectedSalesPoint === sp.id ? 'tab-active' : 'tab-inactive'}
                  onClick={() => setSelectedSalesPoint(sp.id)}
                >
                  {sp.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="table-controls">
          <div className="view-mode-toggle">
            <button
              className={viewMode === 'graphical' ? 'active' : ''}
              onClick={() => setViewMode('graphical')}
            >
              Vue Graphique
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              Vue Liste
            </button>
          </div>

          <div className="table-actions">
            <button className="btn-merge" onClick={() => setShowMergeModal(true)}>
              🔗 Fusionner des tables
            </button>
          </div>

          <div className="filters">
            <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
              <option value="all">Toutes les zones</option>
              {zones.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="occupied">Occupée</option>
              <option value="reserved">Réservée</option>
            </select>
          </div>

          <div className="legend">
            <div className="legend-item">
              <span className="legend-color" style={{background: '#10b981'}}></span>
              <span>Disponible</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{background: '#ef4444'}}></span>
              <span>Occupée</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{background: '#f59e0b'}}></span>
              <span>Réservée</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{background: '#3b82f6'}}></span>
              <span>Fusionnée</span>
            </div>
          </div>
        </div>

        <div className="table-content">
          {viewMode === 'graphical' ? (
            <div className="graphical-view">
              {filteredTables.map(table => (
                <div
                  key={table.id}
                  className="table-item"
                  style={{
                    left: `${table.position_x}px`,
                    top: `${table.position_y}px`,
                    background: getTableColor(table.status)
                  }}
                  onClick={() => handleTableClick(table)}
                >
                  <div className="table-number">{table.table_number}</div>
                  <div className="table-capacity">{table.capacity} pers.</div>
                  {table.status === 'occupied' && (
                    <button
                      className="transfer-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTransferModal(table);
                      }}
                    >
                      ⇄
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="list-view">
              <table className="tables-list">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('table_number')} style={{ cursor: 'pointer' }}>
                      Table {sortField === 'table_number' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('zone')} style={{ cursor: 'pointer' }}>
                      Zone {sortField === 'zone' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('capacity')} style={{ cursor: 'pointer' }}>
                      Capacité {sortField === 'capacity' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                      Statut {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTables.map(table => (
                    <tr key={table.id}>
                      <td><strong>{table.table_number}</strong></td>
                      <td>{table.zone}</td>
                      <td>{table.capacity} pers.</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{background: getTableColor(table.status)}}
                        >
                          {getStatusLabel(table.status)}
                        </span>
                      </td>
                      <td>
                        {table.status === 'occupied' && (
                          <>
                            <button
                              className="btn-small"
                              onClick={() => handleTableClick(table)}
                            >
                              Voir commande
                            </button>
                            <button
                              className="btn-small btn-transfer"
                              onClick={() => openTransferModal(table)}
                            >
                              Transférer
                            </button>
                          </>
                        )}
                        {table.status === 'available' && (
                          <button
                            className="btn-small btn-select"
                            onClick={() => onSelectTable(table)}
                          >
                            Sélectionner
                          </button>
                        )}
                        {table.status === 'merged' && (
                          <button
                            className="btn-small btn-split"
                            onClick={() => openSplitModal(table)}
                          >
                            Séparer
                          </button>
                        )}
                        {table.status === 'occupied' && table.merged_with && table.merged_with.length > 0 && (
                          <button
                            className="btn-small btn-split"
                            onClick={() => openSplitModal(table)}
                          >
                            Séparer
                          </button>
                        )}
                        <button
                          className="btn-small btn-edit"
                          onClick={() => openEditModal(table)}
                        >
                          ✏️ Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transférer la table {selectedTable.table_number}</h3>
              <button className="close-btn" onClick={() => setShowTransferModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Table de destination *</label>
                <select
                  value={transferTarget || ''}
                  onChange={(e) => setTransferTarget(e.target.value)}
                >
                  <option value="">Sélectionner une table</option>
                  {tables
                    .filter(t => t.status === 'available' && t.id !== selectedTable.id)
                    .map(table => (
                      <option key={table.id} value={table.id}>
                        {table.table_number} - {table.zone} ({table.capacity} pers.)
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Raison du transfert *</label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ex: Demande du client, table trop petite..."
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowTransferModal(false)}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleTransfer}>
                Confirmer le transfert
              </button>
            </div>
          </div>
        </div>
      )}

      {showMergeModal && (
        <div className="modal-overlay" onClick={() => setShowMergeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Fusionner des tables</h3>
              <button className="close-btn" onClick={() => setShowMergeModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <p style={{marginBottom: '16px', color: '#6b7280'}}>
                Sélectionnez au moins 2 tables à fusionner. La première table sélectionnée sera la table principale. Les commandes seront fusionnées automatiquement.
              </p>

              <div className="tables-selection">
                {tables
                  .filter(t => t.status === 'available' || t.status === 'occupied')
                  .map(table => (
                    <div
                      key={table.id}
                      className={`table-checkbox ${selectedTablesToMerge.includes(table.id) ? 'selected' : ''}`}
                      onClick={() => toggleTableSelection(table.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTablesToMerge.includes(table.id)}
                        onChange={() => {}}
                      />
                      <span>{table.table_number}</span>
                      <span className="table-details">
                        {table.zone} - {table.capacity} pers.
                        {table.status === 'occupied' && <span style={{marginLeft: '8px', color: '#ef4444', fontWeight: 'bold'}}>• Occupée</span>}
                      </span>
                      {selectedTablesToMerge[0] === table.id && (
                        <span className="primary-badge">Principale</span>
                      )}
                    </div>
                  ))}
              </div>

              {selectedTablesToMerge.length > 0 && (
                <div style={{marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px'}}>
                  <strong>{selectedTablesToMerge.length} table(s) sélectionnée(s)</strong>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => {
                setShowMergeModal(false);
                setSelectedTablesToMerge([]);
              }}>
                Annuler
              </button>
              <button
                className="btn-primary"
                onClick={handleMergeTables}
                disabled={selectedTablesToMerge.length < 2}
              >
                Fusionner les tables
              </button>
            </div>
          </div>
        </div>
      )}

      {showSplitModal && tableToSplit && (
        <div className="modal-overlay" onClick={() => setShowSplitModal(false)}>
          <div className="modal-content split-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Séparer les tables fusionnées</h3>
              <button className="close-btn" onClick={() => setShowSplitModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div style={{padding: '12px', background: '#f0f9ff', borderRadius: '8px', marginBottom: '16px'}}>
                <strong>Tables concernées :</strong>
                <div style={{display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap'}}>
                  <span style={{padding: '4px 12px', background: '#3b82f6', color: 'white', borderRadius: '4px', fontWeight: 'bold'}}>
                    {tableToSplit.table_number} (Principale)
                  </span>
                  {tableToSplit.merged_with?.map(id => {
                    const table = tables.find(t => t.id === id);
                    return table ? (
                      <span key={id} style={{padding: '4px 12px', background: '#6b7280', color: 'white', borderRadius: '4px'}}>
                        {table.table_number}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {splitOrderItems.length > 0 ? (
                <>
                  <p style={{marginBottom: '16px', color: '#6b7280'}}>
                    Assignez chaque article à une table. Les tables sans articles seront libérées.
                  </p>

                  <div className="split-items-list">
                    {splitOrderItems.map(item => (
                      <div key={item.id} className="split-item-row">
                        <div className="split-item-info">
                          <strong>{item.products?.name}</strong>
                          <span className="split-item-details">
                            Qté: {item.quantity} × {item.unit_price.toLocaleString()} FCFA = {(item.quantity * item.unit_price).toLocaleString()} FCFA
                          </span>
                        </div>
                        <select
                          className="split-item-select"
                          value={itemsDistribution[item.id] || tableToSplit.id}
                          onChange={(e) => setItemsDistribution({
                            ...itemsDistribution,
                            [item.id]: e.target.value
                          })}
                        >
                          <option value={tableToSplit.id}>{tableToSplit.table_number}</option>
                          {tableToSplit.merged_with?.map(id => {
                            const table = tables.find(t => t.id === id);
                            return table ? (
                              <option key={id} value={id}>{table.table_number}</option>
                            ) : null;
                          })}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div style={{marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '8px'}}>
                    <strong>Résumé par table :</strong>
                    <div style={{marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      {[tableToSplit.id, ...(tableToSplit.merged_with || [])].map(tableId => {
                        const table = tables.find(t => t.id === tableId);
                        const items = splitOrderItems.filter(item => itemsDistribution[item.id] === tableId);
                        const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
                        return (
                          <div key={tableId} style={{display: 'flex', justifyContent: 'space-between'}}>
                            <span>{table?.table_number} :</span>
                            <span>{items.length} article(s) - {total.toLocaleString()} FCFA</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <p style={{color: '#6b7280', textAlign: 'center', padding: '20px'}}>
                  Aucune commande en cours. Les tables seront simplement libérées.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => {
                setShowSplitModal(false);
                setTableToSplit(null);
                setSplitOrderItems([]);
                setItemsDistribution({});
              }}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleSplitTable}>
                Confirmer la séparation
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && tableToEdit && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Modifier la table</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Numéro de table *</label>
                <input
                  type="text"
                  value={editForm.table_number}
                  onChange={(e) => setEditForm({...editForm, table_number: e.target.value})}
                  placeholder="Ex: Table 1, T1, VIP1..."
                />
              </div>

              <div className="form-group">
                <label>Capacité (nombre de couverts) *</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.capacity}
                  onChange={(e) => setEditForm({...editForm, capacity: e.target.value})}
                  placeholder="Ex: 4"
                />
              </div>

              <div className="form-group">
                <label>Zone / Section</label>
                <input
                  type="text"
                  value={editForm.zone}
                  onChange={(e) => setEditForm({...editForm, zone: e.target.value})}
                  placeholder="Ex: Terrasse, Intérieur, VIP..."
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="form-group">
                  <label>Position X (plan de salle)</label>
                  <input
                    type="number"
                    value={editForm.position_x}
                    onChange={(e) => setEditForm({...editForm, position_x: e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Position Y (plan de salle)</label>
                  <input
                    type="number"
                    value={editForm.position_y}
                    onChange={(e) => setEditForm({...editForm, position_y: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>

              <p style={{fontSize: '13px', color: '#6b7280', marginTop: '8px'}}>
                * Champs obligatoires
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => {
                setShowEditModal(false);
                setTableToEdit(null);
              }}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleEditTable}>
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
