import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logAction } from '../utils/actionLogger';
import { PrintService } from '../utils/printService';
import SplitTicketModal from '../components/SplitTicketModal';
import HotelTransferModal from '../components/HotelTransferModal';
import './POS.css';

export default function POS() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [salesPoints, setSalesPoints] = useState([]);
  const [selectedSalesPoint, setSelectedSalesPoint] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState({});
  const [activePaymentMethod, setActivePaymentMethod] = useState('cash');
  const [numpadValue, setNumpadValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    company_name: '',
    type: 'individual'
  });
  const [holdTickets, setHoldTickets] = useState([]);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [showCountingModal, setShowCountingModal] = useState(false);
  const [physicalCounts, setPhysicalCounts] = useState({});
  const [variance, setVariance] = useState(null);
  const [justification, setJustification] = useState('');
  const [pendingReportType, setPendingReportType] = useState(null);
  const [pendingVoids, setPendingVoids] = useState([]);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidItem, setVoidItem] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showHotelTransferModal, setShowHotelTransferModal] = useState(false);
  const [selectedHotelStay, setSelectedHotelStay] = useState(null);
  const [showTicketsView, setShowTicketsView] = useState(false);
  const [ticketsFilter, setTicketsFilter] = useState('hold');
  const [allTickets, setAllTickets] = useState([]);
  const [currentOrderStatus, setCurrentOrderStatus] = useState('draft');
  const [productionSlipPrinted, setProductionSlipPrinted] = useState(false);
  const [cancellationSlipPrinted, setCancellationSlipPrinted] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showTableModal, setShowTableModal] = useState(false);

  useEffect(() => {
    loadSalesPoints();
  }, []);

  useEffect(() => {
    if (selectedSalesPoint) {
      checkOrCreateSession();
      loadCategories();
      loadProducts();
      loadTables();
      loadClients();
      loadHoldTickets();
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
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement points de vente:', error);
      setLoading(false);
    }
  };

  const checkOrCreateSession = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existingSession } = await supabase
        .from('pos_sessions')
        .select('*')
        .eq('sales_point_id', selectedSalesPoint.id)
        .eq('employee_id', user.id)
        .eq('status', 'active')
        .gte('opened_at', `${today}T00:00:00`)
        .maybeSingle();

      if (existingSession) {
        setCurrentSession(existingSession);
      } else {
        const openingBalance = parseFloat(prompt('Montant en caisse à l\'ouverture (FCFA):', '0')) || 0;

        const { data: newSession, error } = await supabase
          .from('pos_sessions')
          .insert([{
            sales_point_id: selectedSalesPoint.id,
            employee_id: user.id,
            opened_at: new Date().toISOString(),
            opening_balance: openingBalance,
            status: 'active'
          }])
          .select()
          .single();

        if (error) throw error;
        setCurrentSession(newSession);

        await logAction({
          employee_id: user.id,
          action_type: 'POS_SESSION_OPENED',
          entity_type: 'pos_session',
          entity_id: newSession.id,
          details: `Session ouverte pour ${selectedSalesPoint.name} avec ${openingBalance} FCFA`,
          pos_id: selectedSalesPoint.id
        });
      }
    } catch (error) {
      console.error('Erreur session:', error);
      alert('Erreur lors de la gestion de la session');
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_prices!inner(
            sales_point_id,
            selling_price
          ),
          product_types!inner(
            can_be_sold
          )
        `)
        .eq('product_prices.sales_point_id', selectedSalesPoint.id)
        .eq('product_types.can_be_sold', true)
        .order('name');

      if (error) throw error;

      const productsWithPrices = (data || []).map(product => ({
        ...product,
        selling_price: product.product_prices?.[0]?.selling_price || 0
      }));

      setProducts(productsWithPrices);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    }
  };

  const loadTables = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('sales_point_id', selectedSalesPoint.id)
        .order('table_number');

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Erreur chargement tables:', error);
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
    }
  };

  const loadHoldTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), restaurant_tables(table_number), clients(first_name, last_name, company_name, type)')
        .eq('sales_point_id', selectedSalesPoint.id)
        .eq('payment_status', 'pending')
        .neq('status', 'voided')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHoldTickets(data || []);
    } catch (error) {
      console.error('Erreur chargement tickets en attente:', error);
    }
  };

  const loadAllTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), restaurant_tables(table_number), clients(first_name, last_name, company_name, type)')
        .eq('sales_point_id', selectedSalesPoint.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAllTickets(data || []);
    } catch (error) {
      console.error('Erreur chargement tickets:', error);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.selling_price,
        quantity: 1,
        tax_rate: product.vat_rate || 0
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.product_id === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const initiateVoid = (item) => {
    if (!currentOrderId) {
      alert('Cette ligne ne peut pas être annulée car la commande n\'est pas encore validée. Utilisez le bouton de suppression.');
      return;
    }
    setVoidItem(item);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const confirmVoid = () => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.product_id === voidItem.product_id
          ? { ...item, pendingCancellation: true, void_reason: voidReason || 'Non spécifiée' }
          : item
      )
    );

    setShowVoidModal(false);
    setVoidItem(null);
    setVoidReason('');
  };

  const processPendingVoids = async (orderId) => {
    if (pendingVoids.length === 0) return;

    try {
      for (const voidedItem of pendingVoids) {
        const { data: orderItem } = await supabase
          .from('order_items')
          .select('id')
          .eq('order_id', orderId)
          .eq('product_id', voidedItem.product_id)
          .single();

        if (orderItem) {
          await supabase
            .from('order_items')
            .update({ is_voided: true })
            .eq('id', orderItem.id);

          await supabase
            .from('void_logs')
            .insert([{
              order_id: orderId,
              order_item_id: orderItem.id,
              product_name: voidedItem.product_name,
              quantity: voidedItem.quantity,
              unit_price: voidedItem.unit_price,
              total_amount: voidedItem.unit_price * voidedItem.quantity,
              voided_by: user.id,
              void_reason: voidedItem.void_reason,
              sales_point_id: selectedSalesPoint.id
            }]);
        }
      }

      setPendingVoids([]);
    } catch (error) {
      console.error('Erreur traitement annulations:', error);
    }
  };

  const printProductionSlip = async (items, orderNumber, orderId = null) => {
    console.log('🖨️ BON DE FABRICATION:', { orderNumber, items, orderId });

    const orderIdToUse = orderId || currentOrderId;

    if (!orderIdToUse) {
      console.warn('⚠️ Pas d\'order_id disponible pour l\'impression');
      return;
    }

    try {
      const results = await PrintService.printMultipleTickets(
        orderIdToUse,
        selectedSalesPoint.id,
        ['fabrication']
      );

      console.log('📄 Résultats impression:', results);

      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.error('❌ Échecs impression:', failures);
      }
    } catch (error) {
      console.error('❌ Erreur impression:', error);
    }
  };

  const printCancellationSlip = async (items, orderNumber) => {
    console.log('🖨️ BON D\'ANNULATION:', { orderNumber, items, orderId: currentOrderId });

    if (!currentOrderId) {
      console.warn('⚠️ Pas d\'order_id disponible pour le bon d\'annulation');
      return;
    }

    try {
      const result = await PrintService.printCancellation(
        currentOrderId,
        selectedSalesPoint.id,
        items,
        orderNumber
      );

      if (result.success) {
        console.log('✅ Bon d\'annulation imprimé avec succès');
      } else {
        console.error('❌ Échec impression bon d\'annulation:', result.message);
      }
    } catch (error) {
      console.error('❌ Erreur impression bon d\'annulation:', error);
    }
  };

  const processCancellations = async (itemsToCancel, orderNumber) => {
    if (itemsToCancel.length === 0) return { fullyCancelled: false, remainingItems: cart };

    await printCancellationSlip(itemsToCancel, orderNumber);

    const cancelledOrderItems = [];

    for (const item of itemsToCancel) {
      const { data: orderItem } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', currentOrderId)
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (orderItem) {
        cancelledOrderItems.push(orderItem);

        await supabase
          .from('order_items')
          .update({ is_voided: true })
          .eq('id', orderItem.id);

        await supabase
          .from('void_logs')
          .insert([{
            order_id: currentOrderId,
            order_item_id: orderItem.id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_amount: item.unit_price * item.quantity,
            voided_by: user.id,
            void_reason: item.void_reason,
            sales_point_id: selectedSalesPoint.id
          }]);
      }
    }

    await restoreStockFromOrder(cancelledOrderItems, orderNumber);

    const remainingItems = cart.filter(item => !item.pendingCancellation);

    if (remainingItems.length === 0) {
      await supabase
        .from('orders')
        .update({
          status: 'voided',
          payment_status: 'cancelled'
        })
        .eq('id', currentOrderId);

      setCart([]);
      setCurrentOrderId(null);
      setProductionSlipPrinted(false);
      setCancellationSlipPrinted(false);
      await loadHoldTickets();
      return { fullyCancelled: true, remainingItems: [] };
    } else {
      setCart(remainingItems);
      return { fullyCancelled: false, remainingItems };
    }
  };

  const calculateTotalsFromItems = (items) => {
    let total = 0;
    let taxAmount = 0;
    let subtotal = 0;

    items.filter(item => !item.pendingCancellation).forEach(item => {
      const itemTotal = item.unit_price * item.quantity;
      total += itemTotal;

      const priceHT = item.unit_price / (1 + (item.tax_rate / 100));
      const itemSubtotal = priceHT * item.quantity;
      const itemTax = itemTotal - itemSubtotal;

      subtotal += itemSubtotal;
      taxAmount += itemTax;
    });

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  };

  const calculateCartTotals = () => {
    return calculateTotalsFromItems(cart);
  };

  const handlePayment = async () => {
    const totals = calculateCartTotals();
    const totalPaid = Object.values(paymentMethods).reduce((sum, amount) => sum + parseFloat(amount || 0), 0);

    if (Math.abs(totalPaid - totals.total) > 0.01) {
      alert(`Montant incomplet !\nAttendu: ${totals.total.toFixed(0)} FCFA\nReçu: ${totalPaid.toFixed(0)} FCFA`);
      return;
    }

    try {
      let orderId = currentOrderId;
      let orderNumber = null;

      if (!orderId) {
        const orderData = {
          order_number: `ORD-${Date.now()}`,
          sales_point_id: selectedSalesPoint.id,
          pos_session_id: currentSession.id,
          employee_id: user.id,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          status: 'completed',
          payment_status: 'paid',
          kitchen_status: 'sent',
          sent_to_kitchen_at: new Date().toISOString()
        };

        if (selectedTable) orderData.table_id = selectedTable.id;
        if (selectedClient) orderData.client_id = selectedClient.id;

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (orderError) throw orderError;

        orderId = order.id;
        orderNumber = order.order_number;

        const orderItems = cart.map(item => {
          const itemTotal = item.unit_price * item.quantity;
          const itemSubtotal = itemTotal / (1 + (item.tax_rate / 100));
          const itemTax = itemTotal - itemSubtotal;
          return {
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: itemSubtotal,
            tax_rate: item.tax_rate,
            tax_amount: itemTax,
            total: itemTotal
          };
        });

        const { data: insertedItems } = await supabase.from('order_items').insert(orderItems).select();

        await deductStockFromOrder(insertedItems, order.order_number);

        await PrintService.printMultipleTickets(order.id, selectedSalesPoint.id, ['fabrication', 'caisse']);

        await processPendingVoids(order.id);
      } else {
        const updateData = {
          status: 'completed',
          payment_status: 'paid'
        };

        if (selectedTable) updateData.table_id = selectedTable.id;
        if (selectedClient) updateData.client_id = selectedClient.id;

        await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);

        const { data: order } = await supabase
          .from('orders')
          .select('order_number')
          .eq('id', orderId)
          .single();

        orderNumber = order.order_number;

        await PrintService.printMultipleTickets(orderId, selectedSalesPoint.id, ['caisse']);
      }

      for (const [method, amount] of Object.entries(paymentMethods)) {
        if (parseFloat(amount || 0) > 0) {
          await supabase.from('payments').insert([{
            order_id: orderId,
            payment_method: method,
            amount: parseFloat(amount)
          }]);

          if (method === 'client_account' && selectedClient) {
            const { data: client } = await supabase
              .from('clients')
              .select('current_balance')
              .eq('id', selectedClient.id)
              .single();

            const newBalance = parseFloat(client.current_balance) - parseFloat(amount);

            await supabase
              .from('clients')
              .update({ current_balance: newBalance })
              .eq('id', selectedClient.id);

            await supabase
              .from('client_payments')
              .insert([{
                client_id: selectedClient.id,
                order_id: orderId,
                payment_type: 'purchase',
                amount: parseFloat(amount),
                description: `Achat - Commande ${orderNumber}`,
                sales_point_id: selectedSalesPoint.id,
                processed_by: user.id
              }]);

            console.log('Solde client mis à jour:', {
              client_id: selectedClient.id,
              old_balance: client.current_balance,
              amount: parseFloat(amount),
              new_balance: newBalance
            });
          }

          if (method === 'hotel_transfer' && selectedHotelStay) {
            console.log('Transfert hôtel - Création charge:', {
              stay_id: selectedHotelStay.id,
              amount: parseFloat(amount),
              order_number: orderNumber
            });

            const chargeData = {
              stay_id: selectedHotelStay.id,
              charge_type: 'restaurant',
              description: `Restaurant - Commande ${orderNumber}`,
              amount: parseFloat(amount),
              quantity: 1,
              total: parseFloat(amount),
              pos_order_id: orderId,
              charged_by: user.id
            };

            const { data: chargeResult, error: chargeError } = await supabase
              .from('hotel_room_charges')
              .insert([chargeData]);

            if (chargeError) {
              console.error('Erreur création charge hôtel:', chargeError);
              alert(`Erreur lors de l'enregistrement de la charge hôtel: ${chargeError.message}`);
            } else {
              console.log('Charge hôtel créée avec succès:', chargeResult);
            }

            const currentCharges = parseFloat(selectedHotelStay.restaurant_charges || 0);
            const newCharges = currentCharges + parseFloat(amount);
            const currentTotal = parseFloat(selectedHotelStay.total_charges || 0);
            const newTotal = currentTotal + parseFloat(amount);

            console.log('Mise à jour hotel_stays:', {
              stay_id: selectedHotelStay.id,
              currentCharges,
              newCharges,
              currentTotal,
              newTotal
            });

            const { error: updateError } = await supabase
              .from('hotel_stays')
              .update({
                restaurant_charges: newCharges,
                total_charges: newTotal
              })
              .eq('id', selectedHotelStay.id);

            if (updateError) {
              console.error('Erreur mise à jour hotel_stays:', updateError);
            } else {
              console.log('hotel_stays mis à jour avec succès');
            }
          }
        }
      }

      if (selectedTable) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'available', current_order_id: null })
          .eq('id', selectedTable.id);
        await loadTables();
      }

      await loadHoldTickets();
      await loadClients();

      await logAction({
        employee_id: user.id,
        action_type: 'PAYMENT_PROCESSED',
        entity_type: 'order',
        entity_id: orderId,
        details: `Paiement de ${totals.total.toFixed(0)} FCFA`,
        pos_id: selectedSalesPoint.id
      });

      setShowPayment(false);
      setCart([]);
      setPaymentMethods({});
      setSelectedClient(null);
      setSelectedTable(null);
      setCurrentOrderId(null);
      setSelectedHotelStay(null);

      if (selectedClient) {
        const clientName = selectedClient.type === 'company'
          ? selectedClient.company_name
          : `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || 'Client';
        alert(`Vente validée !\nCommande N° ${orderNumber}\nClient: ${clientName}\nMontant: ${totals.total.toFixed(0)} FCFA`);
      } else {
        alert(`Vente validée !\nCommande N° ${orderNumber}\nMontant: ${totals.total.toFixed(0)} FCFA`);
      }
    } catch (error) {
      console.error('Erreur traitement paiement:', error);
      alert('Erreur lors du traitement du paiement: ' + error.message);
    }
  };

  const deductStockFromOrder = async (orderItems, orderNumber) => {
    try {
      const { data: salesPointData } = await supabase
        .from('sales_points')
        .select('default_storage_location_id')
        .eq('id', selectedSalesPoint.id)
        .single();

      const storageLocationId = salesPointData?.default_storage_location_id;
      if (!storageLocationId) {
        console.warn('No default storage location configured for this POS');
        return;
      }

      for (const item of orderItems) {
        const { data: productData } = await supabase
          .from('products')
          .select('is_composed')
          .eq('id', item.product_id)
          .single();

        if (productData?.is_composed) {
          const { data: recipe, error: recipeError } = await supabase
            .from('product_recipes')
            .select('ingredient_id, quantity')
            .eq('product_id', item.product_id);

          if (recipeError) throw recipeError;

          if (!recipe || recipe.length === 0) {
            console.warn(`No recipe found for composed product: ${item.product_name}`);
            continue;
          }

          for (const component of recipe) {
            const quantityToDeduct = component.quantity * item.quantity;

            const { data: currentStock, error: stockError } = await supabase
              .from('product_stocks')
              .select('*')
              .eq('product_id', component.ingredient_id)
              .eq('storage_location_id', storageLocationId)
              .maybeSingle();

            if (stockError) throw stockError;

            let previousQuantity = 0;
            let stockId = null;

            if (!currentStock) {
              const { data: newStock, error: createError } = await supabase
                .from('product_stocks')
                .insert([{
                  product_id: component.ingredient_id,
                  storage_location_id: storageLocationId,
                  quantity: 0
                }])
                .select()
                .single();

              if (createError) throw createError;
              stockId = newStock.id;
              previousQuantity = 0;
            } else {
              stockId = currentStock.id;
              previousQuantity = parseFloat(currentStock.quantity);
            }

            const newQuantity = previousQuantity - quantityToDeduct;

            const { error: updateError } = await supabase
              .from('product_stocks')
              .update({
                quantity: newQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', stockId);

            if (updateError) throw updateError;

            await supabase.from('stock_movements').insert([{
              product_id: component.ingredient_id,
              storage_location_id: storageLocationId,
              movement_type: 'sale',
              quantity: -quantityToDeduct,
              previous_quantity: previousQuantity,
              new_quantity: newQuantity,
              reference: orderNumber,
              pos_id: selectedSalesPoint.id,
              notes: `Vente: ${item.product_name}`
            }]);
          }
        }
      }
    } catch (error) {
      console.error('Erreur déduction stock:', error);
      throw error;
    }
  };

  const restoreStockFromOrder = async (orderItems, orderNumber) => {
    try {
      const { data: salesPointData } = await supabase
        .from('sales_points')
        .select('default_storage_location_id')
        .eq('id', selectedSalesPoint.id)
        .single();

      const storageLocationId = salesPointData?.default_storage_location_id;
      if (!storageLocationId) {
        console.warn('No default storage location configured for this POS');
        return;
      }

      for (const item of orderItems) {
        const { data: productData } = await supabase
          .from('products')
          .select('is_composed')
          .eq('id', item.product_id)
          .single();

        if (productData?.is_composed) {
          const { data: recipe } = await supabase
            .from('product_recipes')
            .select('ingredient_id, quantity')
            .eq('product_id', item.product_id);

          if (!recipe || recipe.length === 0) continue;

          for (const component of recipe) {
            const quantityToRestore = component.quantity * item.quantity;

            const { data: currentStock } = await supabase
              .from('product_stocks')
              .select('*')
              .eq('product_id', component.ingredient_id)
              .eq('storage_location_id', storageLocationId)
              .maybeSingle();

            if (currentStock) {
              const previousQuantity = parseFloat(currentStock.quantity);
              const newQuantity = previousQuantity + quantityToRestore;

              await supabase
                .from('product_stocks')
                .update({
                  quantity: newQuantity,
                  updated_at: new Date().toISOString()
                })
                .eq('id', currentStock.id);

              await supabase.from('stock_movements').insert([{
                product_id: component.ingredient_id,
                storage_location_id: storageLocationId,
                movement_type: 'adjustment_in',
                quantity: quantityToRestore,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                reference: orderNumber,
                pos_id: selectedSalesPoint.id,
                notes: `Annulation commande: ${item.product_name}`
              }]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur restauration stock:', error);
    }
  };

  const handleAssignTable = () => {
    setShowTableModal(true);
  };

  const handleAssignClient = () => {
    setShowClientModal(true);
  };

  const handleConfirmAssignment = async (assignTable, assignClient) => {
    setShowAssignmentModal(false);

    if (assignTable) {
      setShowTableModal(true);
    } else if (assignClient) {
      setShowClientModal(true);
    } else {
      executePendingAction();
    }
  };

  const handleSelectTableFromModal = (table) => {
    setSelectedTable(table);
    setShowTableModal(false);

    if (pendingAction) {
      const shouldShowClient = window.confirm('Voulez-vous également affecter ce ticket à un client ?');
      if (shouldShowClient) {
        setShowClientModal(true);
      } else {
        executePendingAction();
      }
    }
  };

  const handleSelectClientFromModal = (client) => {
    setSelectedClient(client);
    setShowClientModal(false);

    if (pendingAction) {
      executePendingAction();
    }
  };

  const executePendingAction = () => {
    if (pendingAction === 'ticket') {
      handlePrintTicket();
    } else if (pendingAction === 'hold') {
      handleSendAndHold();
    } else if (pendingAction === 'payment') {
      handlePaymentClick();
    }
    setPendingAction(null);
  };

  const handlePrintTicket = async () => {
    console.log('[POS] handlePrintTicket - Start');
    if (cart.length === 0) {
      alert('Le panier est vide');
      return;
    }

    if (!currentOrderId && !selectedTable && !selectedClient) {
      console.log('[POS] No order/table/client - showing assignment modal');
      setPendingAction('ticket');
      setShowAssignmentModal(true);
      return;
    }

    try {
      console.log('[POS] currentOrderId:', currentOrderId);
      const totals = calculateCartTotals();
      let orderNumber = `ORD-${Date.now()}`;

      if (!currentOrderId) {
        console.log('[POS] Creating new order');
        const orderData = {
          order_number: orderNumber,
          sales_point_id: selectedSalesPoint.id,
          pos_session_id: currentSession.id,
          employee_id: user.id,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          status: 'pending',
          payment_status: 'pending',
          kitchen_status: 'sent',
          sent_to_kitchen_at: new Date().toISOString(),
          print_count: 1,
          last_printed_at: new Date().toISOString()
        };

        if (selectedTable) orderData.table_id = selectedTable.id;
        if (selectedClient) orderData.client_id = selectedClient.id;

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (orderError) throw orderError;

        if (selectedTable) {
          await supabase
            .from('restaurant_tables')
            .update({ status: 'occupied', current_order_id: order.id })
            .eq('id', selectedTable.id);
        }

        const orderItems = cart.filter(item => !item.pendingCancellation).map(item => {
          const itemTotal = item.unit_price * item.quantity;
          const itemSubtotal = itemTotal / (1 + (item.tax_rate / 100));
          const itemTax = itemTotal - itemSubtotal;
          return {
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: itemSubtotal,
            tax_rate: item.tax_rate,
            tax_amount: itemTax,
            total: itemTotal
          };
        });

        const { data: insertedItems } = await supabase.from('order_items').insert(orderItems).select();

        setCurrentOrderId(order.id);
        setProductionSlipPrinted(true);

        await deductStockFromOrder(insertedItems, order.order_number);
        await PrintService.printMultipleTickets(order.id, selectedSalesPoint.id, ['fabrication', 'caisse']);

        console.log('[POS] New order created and printed');
        alert('✅ Ticket imprimé et envoyé en cuisine !');
      } else {
        console.log('[POS] Re-printing existing order');
        const itemsToCancel = cart.filter(item => item.pendingCancellation);

        let updatedItems = cart;

        if (itemsToCancel.length > 0) {
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('order_number')
            .eq('id', currentOrderId)
            .single();

          orderNumber = existingOrder.order_number;

          const result = await processCancellations(itemsToCancel, orderNumber);

          if (result.fullyCancelled) {
            alert('✅ Ticket entièrement annulé !');
            return;
          }

          updatedItems = result.remainingItems;
        }

        const updatedTotals = calculateTotalsFromItems(updatedItems);

        const { data: currentOrder } = await supabase
          .from('orders')
          .select('print_count, order_number')
          .eq('id', currentOrderId)
          .single();

        const updateData = {
          subtotal: updatedTotals.subtotal,
          tax_amount: updatedTotals.taxAmount,
          total_amount: updatedTotals.total,
          print_count: (currentOrder?.print_count || 0) + 1,
          last_printed_at: new Date().toISOString()
        };

        await supabase
          .from('orders')
          .update(updateData)
          .eq('id', currentOrderId);

        await PrintService.printMultipleTickets(currentOrderId, selectedSalesPoint.id, ['caisse']);

        console.log('[POS] Order updated, print complete');
        alert('✅ Ticket réimprimé !');
        console.log('[POS] handlePrintTicket - End (success)');
      }
    } catch (error) {
      console.error('[POS] Erreur impression ticket:', error);
      alert('Erreur lors de l\'impression: ' + error.message);
    }
    console.log('[POS] handlePrintTicket - End');
  };

  const handleSendAndHold = async () => {
    if (cart.length === 0) {
      alert('Le panier est vide');
      return;
    }

    if (!currentOrderId && !selectedTable && !selectedClient) {
      setPendingAction('hold');
      setShowAssignmentModal(true);
      return;
    }

    try {
      const totals = calculateCartTotals();
      let orderNumber = `ORD-${Date.now()}`;

      if (!currentOrderId) {
        const orderData = {
          order_number: orderNumber,
          sales_point_id: selectedSalesPoint.id,
          pos_session_id: currentSession.id,
          employee_id: user.id,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          status: 'pending',
          payment_status: 'pending',
          kitchen_status: 'sent',
          sent_to_kitchen_at: new Date().toISOString(),
          is_on_hold: true,
          hold_time: new Date().toISOString()
        };

        if (selectedTable) orderData.table_id = selectedTable.id;
        if (selectedClient) orderData.client_id = selectedClient.id;

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (orderError) throw orderError;

        if (selectedTable) {
          await supabase
            .from('restaurant_tables')
            .update({ status: 'occupied', current_order_id: order.id })
            .eq('id', selectedTable.id);
        }

        const orderItems = cart.filter(item => !item.pendingCancellation).map(item => {
          const itemTotal = item.unit_price * item.quantity;
          const itemSubtotal = itemTotal / (1 + (item.tax_rate / 100));
          const itemTax = itemTotal - itemSubtotal;
          return {
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: itemSubtotal,
            tax_rate: item.tax_rate,
            tax_amount: itemTax,
            total: itemTotal
          };
        });

        const { data: insertedItems } = await supabase.from('order_items').insert(orderItems).select();

        await deductStockFromOrder(insertedItems, order.order_number);

        if (!productionSlipPrinted) {
          await printProductionSlip(cart.filter(item => !item.pendingCancellation), orderNumber, order.id);
        }
      } else {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('order_number, order_items(product_id, quantity)')
          .eq('id', currentOrderId)
          .single();

        orderNumber = existingOrder.order_number;

        const itemsToCancel = cart.filter(item => item.pendingCancellation);

        let updatedItems = cart;

        if (itemsToCancel.length > 0) {
          const result = await processCancellations(itemsToCancel, orderNumber);

          if (result.fullyCancelled) {
            alert('✅ Ticket entièrement annulé !');
            return;
          }

          updatedItems = result.remainingItems;
        }

        const existingProductIds = existingOrder.order_items.map(item => item.product_id);
        const newItems = updatedItems.filter(item =>
          !item.pendingCancellation &&
          !existingProductIds.includes(item.product_id)
        );

        if (newItems.length > 0) {
          const newOrderItems = newItems.map(item => {
            const itemTotal = item.unit_price * item.quantity;
            const itemSubtotal = itemTotal / (1 + (item.tax_rate / 100));
            const itemTax = itemTotal - itemSubtotal;
            return {
              order_id: currentOrderId,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: itemSubtotal,
              tax_rate: item.tax_rate,
              tax_amount: itemTax,
              total: itemTotal
            };
          });

          const { data: insertedItems } = await supabase.from('order_items').insert(newOrderItems).select();
          await deductStockFromOrder(insertedItems, orderNumber);
          await printProductionSlip(newItems, orderNumber, currentOrderId);
        }

        const updatedTotals = calculateTotalsFromItems(updatedItems);

        const updateData = {
          subtotal: updatedTotals.subtotal,
          tax_amount: updatedTotals.taxAmount,
          total_amount: updatedTotals.total,
          is_on_hold: true,
          hold_time: new Date().toISOString()
        };

        if (selectedTable) updateData.table_id = selectedTable.id;
        if (selectedClient) updateData.client_id = selectedClient.id;

        await supabase
          .from('orders')
          .update(updateData)
          .eq('id', currentOrderId);
      }

      setCart([]);
      setSelectedClient(null);
      setSelectedTable(null);
      setCurrentOrderId(null);
      setProductionSlipPrinted(false);
      setCancellationSlipPrinted(false);
      await loadHoldTickets();
      alert('✅ Commande envoyée et mise en attente !');
    } catch (error) {
      console.error('Erreur envoi:', error);
      alert('Erreur lors de l\'envoi: ' + error.message);
    }
  };

  const loadTicketToCart = async (orderId) => {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*), tables(*), clients(*)')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const cartItems = order.order_items
        .filter(item => !item.is_voided)
        .map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          unit_price: item.unit_price,
          unit_price_ht: item.subtotal / item.quantity,
          quantity: item.quantity,
          tax_rate: item.tax_rate,
          pendingCancellation: false
        }));

      setCart(cartItems);
      setCurrentOrderId(order.id);
      setProductionSlipPrinted(true);
      setCancellationSlipPrinted(false);

      if (order.tables) {
        setSelectedTable(order.tables);
      } else {
        setSelectedTable(null);
      }

      if (order.clients) {
        setSelectedClient(order.clients);
      } else {
        setSelectedClient(null);
      }

      await supabase
        .from('orders')
        .update({ is_on_hold: false })
        .eq('id', orderId);

      await loadHoldTickets();
      alert('Ticket rechargé !');
    } catch (error) {
      console.error('Erreur chargement ticket:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handlePaymentClick = async () => {
    if (cart.length === 0) return;

    if (!currentOrderId && !selectedTable && !selectedClient) {
      setPendingAction('payment');
      setShowAssignmentModal(true);
      return;
    }

    try {
      const totals = calculateCartTotals();

      if (!currentOrderId) {
        let orderNumber = `ORD-${Date.now()}`;

        const orderData = {
          order_number: orderNumber,
          sales_point_id: selectedSalesPoint.id,
          pos_session_id: currentSession.id,
          employee_id: user.id,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          status: 'pending',
          payment_status: 'pending',
          kitchen_status: 'sent',
          sent_to_kitchen_at: new Date().toISOString(),
          print_count: 0
        };

        if (selectedTable) orderData.table_id = selectedTable.id;
        if (selectedClient) orderData.client_id = selectedClient.id;

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (orderError) throw orderError;

        if (selectedTable) {
          await supabase
            .from('restaurant_tables')
            .update({ status: 'occupied', current_order_id: order.id })
            .eq('id', selectedTable.id);
          await loadTables();
        }

        const orderItems = cart.filter(item => !item.pendingCancellation).map(item => {
          const itemTotal = item.unit_price * item.quantity;
          const itemSubtotal = itemTotal / (1 + (item.tax_rate / 100));
          const itemTax = itemTotal - itemSubtotal;
          return {
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: itemSubtotal,
            tax_rate: item.tax_rate,
            tax_amount: itemTax,
            total: itemTotal
          };
        });

        const { data: insertedItems } = await supabase.from('order_items').insert(orderItems).select();
        setCurrentOrderId(order.id);

        await deductStockFromOrder(insertedItems, order.order_number);

        if (!productionSlipPrinted) {
          await printProductionSlip(cart.filter(item => !item.pendingCancellation), orderNumber, order.id);
          setProductionSlipPrinted(true);
        }
      } else {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('order_number, order_items(product_id, quantity)')
          .eq('id', currentOrderId)
          .single();

        const orderNumber = existingOrder.order_number;

        const itemsToCancel = cart.filter(item => item.pendingCancellation);

        let updatedItems = cart;

        if (itemsToCancel.length > 0) {
          const result = await processCancellations(itemsToCancel, orderNumber);

          if (result.fullyCancelled) {
            alert('✅ Ticket entièrement annulé !');
            return;
          }

          updatedItems = result.remainingItems;
        }

        const existingProductIds = existingOrder.order_items.map(item => item.product_id);
        const newItems = updatedItems.filter(item =>
          !item.pendingCancellation &&
          !existingProductIds.includes(item.product_id)
        );

        if (newItems.length > 0) {
          const newOrderItems = newItems.map(item => {
            const itemTotal = item.unit_price * item.quantity;
            const itemSubtotal = itemTotal / (1 + (item.tax_rate / 100));
            const itemTax = itemTotal - itemSubtotal;
            return {
              order_id: currentOrderId,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: itemSubtotal,
              tax_rate: item.tax_rate,
              tax_amount: itemTax,
              total: itemTotal
            };
          });

          const { data: insertedItems } = await supabase.from('order_items').insert(newOrderItems).select();
          await deductStockFromOrder(insertedItems, orderNumber);
          await printProductionSlip(newItems, orderNumber, currentOrderId);
        }

        const updatedTotals = calculateTotalsFromItems(updatedItems);

        await supabase
          .from('orders')
          .update({
            subtotal: updatedTotals.subtotal,
            tax_amount: updatedTotals.taxAmount,
            total_amount: updatedTotals.total
          })
          .eq('id', currentOrderId);
      }

      setShowPayment(true);
    } catch (error) {
      console.error('Erreur préparation paiement:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const startReportProcess = async (type) => {
    setPendingReportType(type);

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          payments(payment_method, amount)
        `)
        .eq('sales_point_id', selectedSalesPoint.id)
        .eq('pos_session_id', currentSession.id);

      if (ordersError) throw ordersError;

      const paymentSummary = {};
      let totalSales = 0;

      ordersData.forEach(order => {
        if (order.payment_status === 'paid') {
          totalSales += parseFloat(order.total_amount);

          order.payments.forEach(payment => {
            const method = payment.payment_method;
            paymentSummary[method] = (paymentSummary[method] || 0) + parseFloat(payment.amount);
          });
        }
      });

      const expectedCash = (currentSession.opening_balance || 0) + (paymentSummary['cash'] || 0);

      setReportData({
        totalOrders: ordersData.filter(o => o.payment_status === 'paid').length,
        totalSales,
        paymentSummary,
        openingBalance: currentSession.opening_balance || 0,
        expectedCash,
        expectedAmounts: paymentSummary
      });

      setShowCountingModal(true);
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const validateCounting = () => {
    const variances = {};
    let hasVariance = false;
    let totalVariance = 0;

    Object.keys(reportData.expectedAmounts).forEach(method => {
      const expected = reportData.expectedAmounts[method] || 0;
      const actual = parseFloat(physicalCounts[method] || 0);
      const diff = actual - expected;

      if (Math.abs(diff) > 0.01) {
        variances[method] = {
          expected,
          actual,
          difference: diff
        };
        hasVariance = true;
        totalVariance += Math.abs(diff);
      }
    });

    if (hasVariance) {
      setVariance({ details: variances, total: totalVariance });
    } else {
      setVariance(null);
      generateFinalReport();
    }
  };

  const generateFinalReport = () => {
    setShowCountingModal(false);
    setReportType(pendingReportType);
    setShowReportModal(true);

    if (pendingReportType === 'Z') {
      const confirmClose = window.confirm('Le rapport Z va clôturer définitivement la session. Continuer ?');
      if (!confirmClose) {
        setShowReportModal(false);
        return;
      }
    }
  };

  const confirmWithVariance = () => {
    if (!justification.trim() && variance.total > 1000) {
      alert('Une justification est requise pour un écart supérieur à 1000 FCFA');
      return;
    }
    generateFinalReport();
  };

  const closeSession = async () => {
    try {
      const { error } = await supabase
        .from('pos_sessions')
        .update({
          closed_at: new Date().toISOString(),
          closing_balance: reportData.expectedCash,
          status: 'closed'
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      alert('Session clôturée avec succès !');
      setShowReportModal(false);
      setCurrentSession(null);
      setCart([]);
    } catch (error) {
      console.error('Erreur clôture session:', error);
      alert('Erreur lors de la clôture: ' + error.message);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette commande ?')) return;

    try {
      const { data: order } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .single();

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      await restoreStockFromOrder(orderItems, order.order_number);

      await supabase
        .from('orders')
        .update({ status: 'voided', payment_status: 'cancelled' })
        .eq('id', orderId);

      await loadHoldTickets();
      alert('Commande annulée et stock restauré !');
    } catch (error) {
      console.error('Erreur annulation commande:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const cancelCurrentTicket = async () => {
    console.log('cancelCurrentTicket appelé, currentOrderId:', currentOrderId);

    if (!currentOrderId) {
      setCart([]);
      alert('Panier vidé !');
      return;
    }

    if (!window.confirm('Voulez-vous vraiment annuler ce ticket ? Le stock sera restauré.')) return;

    try {
      console.log('Récupération de la commande:', currentOrderId);
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', currentOrderId)
        .single();

      if (orderError) throw orderError;
      console.log('Commande trouvée:', order);

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', currentOrderId);

      if (itemsError) throw itemsError;
      console.log('Articles trouvés:', orderItems);

      console.log('Impression du bon d\'annulation...');
      const cartItems = orderItems.map(item => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        void_reason: 'Annulation ticket complet'
      }));
      await printCancellationSlip(cartItems, order.order_number);

      console.log('Restauration du stock...');
      await restoreStockFromOrder(orderItems, order.order_number);

      console.log('Mise à jour du statut de la commande...');
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'voided', payment_status: 'voided' })
        .eq('id', currentOrderId);

      if (updateError) throw updateError;

      setCart([]);
      setCurrentOrderId(null);
      setProductionSlipPrinted(false);
      setCancellationSlipPrinted(false);
      await loadHoldTickets();

      console.log('✅ Ticket annulé avec succès');
      alert('✅ Ticket annulé et stock restauré !');
    } catch (error) {
      console.error('Erreur annulation ticket:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category_id === selectedCategory);

  const totals = calculateCartTotals();

  if (loading) return <div className="loading">Chargement...</div>;

  if (!selectedSalesPoint) {
    return (
      <div className="pos-container">
        <div className="pos-selection">
          <div className="pos-selection-header">
            <button className="back-button" onClick={() => navigate('/dashboard')}>
              ← Retour au tableau de bord
            </button>
            <h2>Sélectionner un point de vente</h2>
            <div className="spacer"></div>
          </div>
          <div className="sales-points-grid">
            {salesPoints.map(sp => {
              const typeIcons = {
                'bar': '🍸',
                'restaurant': '🍽️',
                'nightclub': '🎵',
                'hotel': '🏨'
              };
              const typeLabels = {
                'bar': 'Bar',
                'restaurant': 'Restaurant',
                'nightclub': 'Nightclub',
                'hotel': 'Hôtel'
              };
              return (
                <button
                  key={sp.id}
                  className="sales-point-card"
                  onClick={() => setSelectedSalesPoint(sp)}
                >
                  <div className="sales-point-icon">{typeIcons[sp.type] || '🏪'}</div>
                  <h3>{sp.name}</h3>
                  <span className="sales-point-type">{typeLabels[sp.type] || sp.type}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return <div className="loading">Initialisation de la session...</div>;
  }

  return (
    <div className="pos-container">
      <div className="orchestra-layout">
        <div className="pos-sidebar">
          <div className="pos-sidebar-header">
            <h3>{selectedSalesPoint.name}</h3>
            <span className="session-badge-small">{user?.username}</span>
          </div>
          <div className="sidebar-actions">
            <button onClick={() => setShowTicketsView(!showTicketsView)} className="sidebar-btn">TICKETS</button>
            <button onClick={() => startReportProcess('X')} className="sidebar-btn">RAPPORT X</button>
            <button onClick={() => startReportProcess('Z')} className="sidebar-btn">RAPPORT Z</button>
            <button onClick={() => navigate('/dashboard')} className="sidebar-btn">RETOUR</button>
          </div>
        </div>

        <div className="pos-main">
          <div className="pos-header-fullscreen">
            <div className="pos-header-left">
              <h3>{selectedSalesPoint.name}</h3>
              <span className="user-badge">{user?.username}</span>
            </div>
            <div className="pos-header-actions">
              <button onClick={() => setShowTicketsView(!showTicketsView)} className="header-btn">TICKETS</button>
              <button onClick={() => startReportProcess('X')} className="header-btn">RAPPORT X</button>
              <button onClick={() => startReportProcess('Z')} className="header-btn">RAPPORT Z</button>
              <button onClick={() => navigate('/dashboard')} className="header-btn header-btn-danger">RETOUR</button>
            </div>
          </div>

          <div className="ticket-section">
            <div className="ticket-header">
              <div className="ticket-info">
                <span className="ticket-label">TICKET</span>
                {selectedTable && (
                  <span className="table-indicator">Table {selectedTable.table_number}</span>
                )}
                {selectedClient && (
                  <span className="client-indicator">
                    {selectedClient.type === 'company'
                      ? selectedClient.company_name
                      : `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || 'Client'}
                  </span>
                )}
              </div>
              <div className="ticket-total">
                <span className="total-amount">{totals.total.toFixed(0)}</span>
                <span className="currency">FCFA</span>
              </div>
            </div>
            <div className="ticket-items">
              {cart.length === 0 ? (
                <div className="ticket-empty">Aucun article</div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className={`ticket-item ${item.pendingCancellation ? 'pending-cancel' : ''}`}>
                    <div className="ticket-item-qty">{item.quantity}</div>
                    <div className="ticket-item-name">{item.product_name}</div>
                    <div className="ticket-item-price">{item.unit_price.toFixed(0)}</div>
                    <div className="ticket-item-actions">
                      {currentOrderId ? (
                        <button onClick={() => initiateVoid(item)} className="ticket-item-void" disabled={item.pendingCancellation}>
                          ANNULER
                        </button>
                      ) : (
                        <button onClick={() => removeFromCart(item.product_id)} className="ticket-item-remove">
                          SUPPR
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="products-section-new">
            <div className="categories-tabs-horizontal">
              <button
                className={selectedCategory === 'all' ? 'cat-tab active' : 'cat-tab'}
                onClick={() => setSelectedCategory('all')}
              >
                Tous
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={selectedCategory === cat.id ? 'cat-tab active' : 'cat-tab'}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    borderColor: cat.color || '#64748b',
                    backgroundColor: selectedCategory === cat.id ? cat.color : 'transparent',
                    color: selectedCategory === cat.id ? 'white' : '#1e293b'
                  }}
                >
                  <span className="cat-icon">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
            <div className="products-grid-new">
              {filteredProducts.map(product => {
                const productCategory = categories.find(c => c.id === product.category_id);
                return (
                  <button
                    key={product.id}
                    className="product-card-new"
                    onClick={() => addToCart(product)}
                    style={{
                      borderColor: productCategory?.color || '#e2e8f0'
                    }}
                  >
                    {product.is_popular && (
                      <div className="popular-badge">⭐</div>
                    )}
                    {product.icon && (
                      <div className="product-icon">{product.icon}</div>
                    )}
                    <div className="product-name">{product.name}</div>
                    <div className="product-price">{product.selling_price.toFixed(0)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pos-rightbar">
          <div className="main-actions">
            <button onClick={handleAssignTable} className="action-btn action-assign">TABLES</button>
            <button onClick={handleAssignClient} className="action-btn action-assign">CLIENTS</button>
            <button onClick={handlePrintTicket} className="action-btn action-ticket-print" disabled={cart.length === 0}>TICKET</button>
            <button onClick={handleSendAndHold} className="action-btn action-send" disabled={cart.length === 0}>ENVOYER</button>
            <button onClick={handlePaymentClick} className="action-btn action-payment" disabled={cart.length === 0}>PAIEMENT</button>
            <button onClick={cancelCurrentTicket} className="action-btn action-cancel">ANNULER<br/>TICKET</button>
          </div>
        </div>
      </div>

      {showTicketsView && (
        <div className="modal-overlay" onClick={() => setShowTicketsView(false)}>
          <div className="modal large tickets-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Gestion des Tickets</h3>
              <button onClick={() => setShowTicketsView(false)} className="close-btn">×</button>
            </div>
            <div className="tickets-filter">
              <select value={ticketsFilter} onChange={(e) => { setTicketsFilter(e.target.value); if (e.target.value !== 'hold') loadAllTickets(); }}>
                <option value="hold">Tickets en attente</option>
                <option value="paid">Tickets encaissés</option>
                <option value="voided">Tickets annulés</option>
              </select>
            </div>
            <div className="tickets-table-container">
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>N° Ticket</th>
                    <th>Date/Heure</th>
                    <th>Table</th>
                    <th>Client</th>
                    <th>Articles</th>
                    <th>Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsFilter === 'hold' && holdTickets.length === 0 && (
                    <tr><td colSpan="7" className="no-tickets-row">Aucun ticket en attente</td></tr>
                  )}
                  {ticketsFilter === 'hold' && holdTickets.map(ticket => (
                    <tr key={ticket.id} onClick={() => { loadTicketToCart(ticket.id); setShowTicketsView(false); }} className="ticket-row clickable">
                      <td className="ticket-number">{ticket.order_number}</td>
                      <td>{new Date(ticket.hold_time || ticket.created_at).toLocaleString()}</td>
                      <td>{ticket.restaurant_tables ? `Table ${ticket.restaurant_tables.table_number}` : '-'}</td>
                      <td>{ticket.clients ? (ticket.clients.type === 'company' ? ticket.clients.company_name : `${ticket.clients.first_name || ''} ${ticket.clients.last_name || ''}`.trim()) : '-'}</td>
                      <td>{ticket.order_items?.length || 0} article(s)</td>
                      <td className="ticket-amount">{parseFloat(ticket.total_amount).toFixed(0)} FCFA</td>
                      <td><span className="status-badge status-hold">En attente</span></td>
                    </tr>
                  ))}
                  {ticketsFilter === 'paid' && allTickets.filter(t => t.payment_status === 'paid').length === 0 && (
                    <tr><td colSpan="7" className="no-tickets-row">Aucun ticket encaissé</td></tr>
                  )}
                  {ticketsFilter === 'paid' && allTickets.filter(t => t.payment_status === 'paid').map(ticket => (
                    <tr key={ticket.id} className="ticket-row">
                      <td className="ticket-number">{ticket.order_number}</td>
                      <td>{new Date(ticket.created_at).toLocaleString()}</td>
                      <td>{ticket.restaurant_tables ? `Table ${ticket.restaurant_tables.table_number}` : '-'}</td>
                      <td>{ticket.clients ? (ticket.clients.type === 'company' ? ticket.clients.company_name : `${ticket.clients.first_name || ''} ${ticket.clients.last_name || ''}`.trim()) : '-'}</td>
                      <td>{ticket.order_items?.length || 0} article(s)</td>
                      <td className="ticket-amount">{parseFloat(ticket.total_amount).toFixed(0)} FCFA</td>
                      <td><span className="status-badge status-paid">Encaissé</span></td>
                    </tr>
                  ))}
                  {ticketsFilter === 'voided' && allTickets.filter(t => t.status === 'voided').length === 0 && (
                    <tr><td colSpan="7" className="no-tickets-row">Aucun ticket annulé</td></tr>
                  )}
                  {ticketsFilter === 'voided' && allTickets.filter(t => t.status === 'voided').map(ticket => (
                    <tr key={ticket.id} className="ticket-row">
                      <td className="ticket-number">{ticket.order_number}</td>
                      <td>{new Date(ticket.created_at).toLocaleString()}</td>
                      <td>{ticket.restaurant_tables ? `Table ${ticket.restaurant_tables.table_number}` : '-'}</td>
                      <td>{ticket.clients ? (ticket.clients.type === 'company' ? ticket.clients.company_name : `${ticket.clients.first_name || ''} ${ticket.clients.last_name || ''}`.trim()) : '-'}</td>
                      <td>{ticket.order_items?.length || 0} article(s)</td>
                      <td className="ticket-amount">{parseFloat(ticket.total_amount).toFixed(0)} FCFA</td>
                      <td><span className="status-badge status-voided">Annulé</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <div className="payment-modal-new">
            <div className="payment-header">
              <div className="payment-title">
                <h2>Encaissement</h2>
                <p className="order-number">Ticket N° {currentOrderId || 'Nouveau'}</p>
              </div>
              <button onClick={() => setShowPayment(false)} className="close-btn-new">×</button>
            </div>

            <div className="payment-body">
              <div className="payment-left">
                <div className="total-section">
                  <div className="total-label">MONTANT TOTAL</div>
                  <div className="total-amount">{totals.total.toFixed(0)}</div>
                  <div className="total-currency">FCFA</div>
                </div>

                <div className="payment-tabs">
                  {[
                    { key: 'cash', label: 'Espèces', icon: '💵' },
                    { key: 'orange_money', label: 'Orange Money', icon: '🟠' },
                    { key: 'wave', label: 'Wave', icon: '🌊' },
                    { key: 'card', label: 'Carte Bleue', icon: '💳' },
                    { key: 'client_account', label: 'Compte Client', icon: '👤' },
                    ...(selectedSalesPoint?.name === 'Restaurant Le Jardin' ? [{ key: 'hotel_transfer', label: 'Transfert Hôtel', icon: '🏨' }] : [])
                  ].map(method => (
                    <button
                      key={method.key}
                      className={`payment-tab ${activePaymentMethod === method.key ? 'active' : ''}`}
                      onClick={() => {
                        setActivePaymentMethod(method.key);
                        setNumpadValue(paymentMethods[method.key] || '');
                      }}
                    >
                      <span className="tab-icon">{method.icon}</span>
                      <span className="tab-label">{method.label}</span>
                      {paymentMethods[method.key] > 0 && (
                        <span className="tab-amount">{parseFloat(paymentMethods[method.key]).toFixed(0)}</span>
                      )}
                    </button>
                  ))}
                </div>

                {activePaymentMethod === 'hotel_transfer' ? (
                  <div className="hotel-transfer-section">
                    <label className="input-label">Transfert vers chambre d'hôtel</label>
                    <p className="hotel-info-text">
                      {selectedHotelStay
                        ? `✓ Chambre ${selectedHotelStay.hotel_rooms?.room_number} - ${selectedHotelStay.guest_name}`
                        : 'Cliquez sur le bouton ci-dessous pour sélectionner une chambre'}
                    </p>
                    <button
                      className="btn-select-room"
                      onClick={() => {
                        console.log('Ouverture modal transfert hôtel');
                        setShowHotelTransferModal(true);
                      }}
                    >
                      🏨 {selectedHotelStay ? 'Changer de chambre' : 'Sélectionner une chambre'}
                    </button>
                    {selectedHotelStay && (
                      <div className="selected-room-details">
                        <div className="room-detail-row">
                          <span>Chambre:</span>
                          <strong>{selectedHotelStay.hotel_rooms?.room_number}</strong>
                        </div>
                        <div className="room-detail-row">
                          <span>Client:</span>
                          <strong>{selectedHotelStay.guest_name}</strong>
                        </div>
                        <div className="room-detail-row">
                          <span>Formule:</span>
                          <strong>{selectedHotelStay.hotel_meal_plans?.name || 'Chambre Seule'}</strong>
                        </div>
                        <div className="room-detail-row">
                          <span>Charges actuelles:</span>
                          <strong>{(selectedHotelStay.restaurant_charges || 0).toFixed(0)} FCFA</strong>
                        </div>
                      </div>
                    )}
                  </div>
                ) : activePaymentMethod === 'client_account' ? (
                  <div className="client-selection-section">
                    <label className="input-label">Rechercher un client</label>
                    <input
                      type="text"
                      className="client-search-input"
                      placeholder="Nom, prénom, entreprise, téléphone..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                    />
                    <div className="client-list">
                      {clients
                        .filter(client => {
                          if (!clientSearchTerm) return true;
                          const search = clientSearchTerm.toLowerCase();
                          const firstName = (client.first_name || '').toLowerCase();
                          const lastName = (client.last_name || '').toLowerCase();
                          const companyName = (client.company_name || '').toLowerCase();
                          const phone = (client.phone || '').toLowerCase();
                          const clientNumber = (client.client_number || '').toLowerCase();

                          return firstName.includes(search) ||
                                 lastName.includes(search) ||
                                 companyName.includes(search) ||
                                 phone.includes(search) ||
                                 clientNumber.includes(search);
                        })
                        .slice(0, 8)
                        .map(client => (
                          <div
                            key={client.id}
                            className={`client-item ${selectedClient?.id === client.id ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedClient(client);
                              setNumpadValue(totals.total.toString());
                              setPaymentMethods({ ...paymentMethods, client_account: totals.total });
                            }}
                          >
                            <div className="client-item-name">
                              {client.type === 'company' ? client.company_name : `${client.first_name} ${client.last_name}`}
                            </div>
                            <div className="client-item-details">
                              <span>{client.phone}</span>
                              <span className={client.current_balance < 0 ? 'text-danger' : 'text-success'}>
                                {parseFloat(client.current_balance).toFixed(0)} FCFA
                              </span>
                            </div>
                          </div>
                        ))}
                      {clients.filter(client => {
                        if (!clientSearchTerm) return true;
                        const search = clientSearchTerm.toLowerCase();
                        const firstName = (client.first_name || '').toLowerCase();
                        const lastName = (client.last_name || '').toLowerCase();
                        const companyName = (client.company_name || '').toLowerCase();
                        const phone = (client.phone || '').toLowerCase();
                        const clientNumber = (client.client_number || '').toLowerCase();

                        return firstName.includes(search) ||
                               lastName.includes(search) ||
                               companyName.includes(search) ||
                               phone.includes(search) ||
                               clientNumber.includes(search);
                      }).length === 0 && (
                        <div className="no-results">Aucun client trouvé</div>
                      )}
                    </div>
                    {selectedClient && (
                      <div className="client-info-box">
                        <div className="client-info-row">
                          <span>Solde actuel:</span>
                          <strong className={selectedClient.current_balance < 0 ? 'text-danger' : 'text-success'}>
                            {selectedClient.current_balance.toFixed(0)} FCFA
                          </strong>
                        </div>
                        <div className="client-info-row">
                          <span>Plafond autorisé:</span>
                          <strong>{selectedClient.credit_limit.toFixed(0)} FCFA</strong>
                        </div>
                        <div className="client-info-row">
                          <span>Après cette commande:</span>
                          <strong className={(selectedClient.current_balance - totals.total) < -selectedClient.credit_limit ? 'text-danger' : 'text-warning'}>
                            {(selectedClient.current_balance - totals.total).toFixed(0)} FCFA
                          </strong>
                        </div>
                        {(selectedClient.current_balance - totals.total) < -selectedClient.credit_limit && (
                          <div className="client-warning">
                            ⚠️ Dépassement du plafond autorisé ! Transaction bloquée.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="payment-input-section">
                    <label className="input-label">
                      {activePaymentMethod === 'cash' ? 'Montant reçu' :
                       activePaymentMethod === 'orange_money' ? 'Montant Orange Money' :
                       activePaymentMethod === 'wave' ? 'Montant Wave' : 'Montant Carte Bleue'}
                    </label>
                    <div className="payment-input-display">
                      <input
                        type="text"
                        className="payment-input"
                        value={numpadValue}
                        readOnly
                        placeholder="0"
                      />
                      <span className="input-currency">FCFA</span>
                    </div>
                  </div>
                )}

                {activePaymentMethod === 'cash' && numpadValue && parseFloat(numpadValue) > 0 && (
                  <div className="change-section">
                    <div className="change-row">
                      <span>Total payé:</span>
                      <strong>{Object.values(paymentMethods).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(0)} FCFA</strong>
                    </div>
                    {parseFloat(numpadValue) >= totals.total && (
                      <div className="change-highlight">
                        <span>RENDU MONNAIE:</span>
                        <strong className="change-amount">
                          {(parseFloat(numpadValue) - totals.total + Object.values(paymentMethods).reduce((s, v) => s + (parseFloat(v) || 0), 0) - (parseFloat(paymentMethods[activePaymentMethod]) || 0)).toFixed(0)} FCFA
                        </strong>
                      </div>
                    )}
                  </div>
                )}

                <div className="payment-summary">
                  <div className="summary-row">
                    <span>Total à payer:</span>
                    <strong>{totals.total.toFixed(0)} FCFA</strong>
                  </div>
                  <div className="summary-row">
                    <span>Total saisi:</span>
                    <strong className={Object.values(paymentMethods).reduce((s, v) => s + (parseFloat(v) || 0), 0) >= totals.total ? 'text-success' : 'text-warning'}>
                      {Object.values(paymentMethods).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(0)} FCFA
                    </strong>
                  </div>
                  {Object.values(paymentMethods).reduce((s, v) => s + (parseFloat(v) || 0), 0) < totals.total && (
                    <div className="summary-row">
                      <span>Reste:</span>
                      <strong className="text-danger">
                        {(totals.total - Object.values(paymentMethods).reduce((s, v) => s + (parseFloat(v) || 0), 0)).toFixed(0)} FCFA
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="payment-right">
                {activePaymentMethod !== 'client_account' && activePaymentMethod !== 'hotel_transfer' && (
                  <div className="numpad-payment">
                    <div className="numpad-grid">
                      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', '000'].map(num => (
                        <button
                          key={num}
                          className="numpad-key"
                          onClick={() => {
                            const newValue = numpadValue + num;
                            setNumpadValue(newValue);
                            setPaymentMethods({ ...paymentMethods, [activePaymentMethod]: newValue });
                          }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="numpad-actions">
                    <button
                      className="numpad-action-btn btn-clear"
                      onClick={() => {
                        setNumpadValue('');
                        setPaymentMethods({ ...paymentMethods, [activePaymentMethod]: '' });
                      }}
                    >
                      EFFACER
                    </button>
                    <button
                      className="numpad-action-btn btn-backspace"
                      onClick={() => {
                        const newValue = numpadValue.slice(0, -1);
                        setNumpadValue(newValue);
                        setPaymentMethods({ ...paymentMethods, [activePaymentMethod]: newValue });
                      }}
                    >
                      ⌫
                    </button>
                    <button
                      className="numpad-action-btn btn-exact"
                      onClick={() => {
                        const remaining = totals.total - Object.values(paymentMethods).reduce((s, v) => s + (parseFloat(v) || 0), 0) + (parseFloat(paymentMethods[activePaymentMethod]) || 0);
                        setNumpadValue(remaining.toString());
                        setPaymentMethods({ ...paymentMethods, [activePaymentMethod]: remaining.toString() });
                      }}
                    >
                      EXACT
                    </button>
                  </div>
                  </div>
                )}
              </div>
            </div>

            <div className="payment-footer">
              <button
                className="btn-payment-action btn-split"
                onClick={() => {
                  if (cart.length === 0) {
                    alert('Le panier est vide. Ajoutez des articles avant de diviser la note.');
                    return;
                  }
                  setShowPayment(false);
                  setShowSplitModal(true);
                }}
              >
                ✂️ DIVISER LA NOTE
              </button>
              <button className="btn-payment-action btn-cancel" onClick={() => setShowPayment(false)}>
                ANNULER
              </button>
              <button
                className="btn-payment-action btn-validate"
                onClick={handlePayment}
                disabled={
                  Object.values(paymentMethods).reduce((s, v) => s + (parseFloat(v) || 0), 0) < totals.total ||
                  (activePaymentMethod === 'client_account' && (!selectedClient || (selectedClient.current_balance - totals.total) < -selectedClient.credit_limit)) ||
                  (activePaymentMethod === 'hotel_transfer' && !selectedHotelStay)
                }
              >
                ✓ VALIDER PAIEMENT
              </button>
            </div>
        </div>
      )}

      {showClientModal && (
        <div className="modal-overlay">
          <div className="modal large">
            <h3>Gestion Client</h3>
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="search-input"
            />
            <div className="clients-list">
              {clients
                .filter(c =>
                  c.first_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  c.last_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  c.company_name?.toLowerCase().includes(clientSearch.toLowerCase())
                )
                .map(client => (
                  <div
                    key={client.id}
                    className="client-item"
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientModal(false);
                    }}
                  >
                    <p>{client.type === 'company' ? client.company_name : `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Sans nom'}</p>
                    <p className="client-phone">{client.phone}</p>
                  </div>
                ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowClientModal(false)} className="cancel">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {showVoidModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Annuler l'article</h3>
            <p>Article: {voidItem?.product_name}</p>
            <textarea
              placeholder="Raison de l'annulation (obligatoire)"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows="3"
            />
            <div className="modal-actions">
              <button onClick={() => setShowVoidModal(false)} className="cancel">Annuler</button>
              <button onClick={confirmVoid} className="confirm danger">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {showCountingModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Comptage des moyens de paiement</h3>
            {Object.keys(reportData.expectedAmounts).map(method => (
              <div key={method} className="payment-counting">
                <label>
                  {method === 'cash' ? 'Espèces' : method === 'card' ? 'Carte' : method === 'mobile_money' ? 'Mobile Money' : method === 'cheque' ? 'Chèque' : method}
                  <span className="expected"> (Attendu: {reportData.expectedAmounts[method].toFixed(0)} FCFA)</span>
                </label>
                <input
                  type="number"
                  value={physicalCounts[method] || ''}
                  onChange={(e) => setPhysicalCounts({ ...physicalCounts, [method]: e.target.value })}
                  placeholder="Montant réel"
                />
              </div>
            ))}
            {variance && (
              <div className="variance-alert">
                <h4>⚠️ Écart détecté: {variance.total.toFixed(0)} FCFA</h4>
                <textarea
                  placeholder="Justification (obligatoire si écart > 1000 FCFA)"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows="3"
                />
                <button onClick={confirmWithVariance} className="confirm">Confirmer avec écart</button>
              </div>
            )}
            <div className="modal-actions">
              <button onClick={() => setShowCountingModal(false)} className="cancel">Annuler</button>
              <button onClick={validateCounting} className="confirm">Valider</button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && reportData && (
        <div className="modal-overlay">
          <div className="modal report">
            <h2>Rapport {reportType}</h2>
            <div className="report-content">
              <p><strong>Point de vente:</strong> {selectedSalesPoint.name}</p>
              <p><strong>Caissier:</strong> {user?.username}</p>
              <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
              <hr />
              <p><strong>Nombre de commandes:</strong> {reportData.totalOrders}</p>
              <p><strong>Total des ventes:</strong> {reportData.totalSales.toFixed(0)} FCFA</p>
              <hr />
              <h4>Détail des paiements:</h4>
              {Object.entries(reportData.paymentSummary).map(([method, amount]) => (
                <p key={method}>
                  {method === 'cash' ? 'Espèces' : method === 'card' ? 'Carte' : method === 'mobile_money' ? 'Mobile Money' : method === 'cheque' ? 'Chèque' : method}: {amount.toFixed(0)} FCFA
                </p>
              ))}
              <hr />
              <p><strong>Fond de caisse ouverture:</strong> {reportData.openingBalance.toFixed(0)} FCFA</p>
              <p><strong>Espèces attendues:</strong> {reportData.expectedCash.toFixed(0)} FCFA</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowReportModal(false)} className="cancel">Fermer</button>
              {reportType === 'Z' && (
                <button onClick={closeSession} className="confirm danger">Clôturer session</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSplitModal && (
        <SplitTicketModal
          cart={cart}
          onClose={() => setShowSplitModal(false)}
          onSplit={(splitCarts) => {
            console.log('Tickets divisés:', splitCarts);
            setShowSplitModal(false);
          }}
        />
      )}

      <HotelTransferModal
        isOpen={showHotelTransferModal}
        onClose={() => setShowHotelTransferModal(false)}
        onSelectRoom={(stay) => {
          setSelectedHotelStay(stay);
          setShowHotelTransferModal(false);
          const totals = calculateCartTotals();
          setNumpadValue(totals.total.toString());
          setPaymentMethods({ ...paymentMethods, hotel_transfer: totals.total.toString() });
        }}
        totalAmount={calculateCartTotals().total}
      />

      {showAssignmentModal && (
        <div className="modal-overlay" onClick={() => { setShowAssignmentModal(false); setPendingAction(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Affecter le ticket</h3>
              <button onClick={() => { setShowAssignmentModal(false); setPendingAction(null); }} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px' }}>Voulez-vous affecter ce ticket à une table ou un client ?</p>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button onClick={() => handleConfirmAssignment(true, false)} className="btn-primary" style={{ padding: '15px', fontSize: '16px' }}>
                  Affecter à une TABLE
                </button>
                <button onClick={() => handleConfirmAssignment(false, true)} className="btn-primary" style={{ padding: '15px', fontSize: '16px' }}>
                  Affecter à un CLIENT
                </button>
                <button onClick={() => handleConfirmAssignment(false, false)} className="btn-secondary" style={{ padding: '15px', fontSize: '16px' }}>
                  Continuer sans affecter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTableModal && (
        <div className="modal-overlay" onClick={() => setShowTableModal(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sélectionner une table</h3>
              <button onClick={() => setShowTableModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Rechercher une table..."
                  value={tableSearchTerm}
                  onChange={(e) => setTableSearchTerm(e.target.value)}
                  className="input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => {
                    setShowTableModal(false);
                    navigate('/table-management', { state: { salesPointId: selectedSalesPoint.id } });
                  }}
                  className="btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Affichage graphique
                </button>
              </div>
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Numéro</th>
                      <th>Capacité</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables
                      .filter(t => t.sales_point_id === selectedSalesPoint.id)
                      .filter(t => {
                        const search = tableSearchTerm.toLowerCase();
                        return !search || t.table_number.toLowerCase().includes(search);
                      })
                      .sort((a, b) => {
                        const numA = parseInt(a.table_number.replace(/\D/g, '')) || 0;
                        const numB = parseInt(b.table_number.replace(/\D/g, '')) || 0;
                        return numA - numB;
                      })
                      .map(table => (
                      <tr key={table.id}>
                        <td>{table.table_number}</td>
                        <td>{table.capacity} pers.</td>
                        <td>
                          <span className={`badge ${table.status === 'available' ? 'badge-success' : table.status === 'occupied' ? 'badge-danger' : 'badge-warning'}`}>
                            {table.status === 'available' ? 'Libre' : table.status === 'occupied' ? 'Occupée' : 'Réservée'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleSelectTableFromModal(table)}
                            className="btn-primary btn-sm"
                            disabled={table.status === 'occupied'}
                          >
                            Sélectionner
                          </button>
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

      {showClientModal && (
        <div className="modal-overlay" onClick={() => setShowClientModal(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sélectionner un client</h3>
              <button onClick={() => setShowClientModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Téléphone</th>
                      <th>Type</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients
                      .filter(c => {
                        const search = clientSearchTerm.toLowerCase();
                        return !search ||
                          c.first_name?.toLowerCase().includes(search) ||
                          c.last_name?.toLowerCase().includes(search) ||
                          c.company_name?.toLowerCase().includes(search) ||
                          c.phone?.includes(search);
                      })
                      .sort((a, b) => {
                        const nameA = a.type === 'company'
                          ? (a.company_name || '').toLowerCase()
                          : `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase().trim();
                        const nameB = b.type === 'company'
                          ? (b.company_name || '').toLowerCase()
                          : `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase().trim();
                        return nameA.localeCompare(nameB);
                      })
                      .map(client => (
                      <tr key={client.id}>
                        <td>
                          {client.type === 'company'
                            ? client.company_name
                            : `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Sans nom'}
                        </td>
                        <td>{client.phone || '-'}</td>
                        <td>
                          <span className={`badge ${client.type === 'company' ? 'badge-info' : 'badge-secondary'}`}>
                            {client.type === 'company' ? 'Entreprise' : 'Particulier'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleSelectClientFromModal(client)}
                            className="btn-primary btn-sm"
                          >
                            Sélectionner
                          </button>
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
    </div>
  );
}
