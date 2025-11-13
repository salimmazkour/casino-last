import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './PurchaseHistory.css';

export default function PurchaseHistory() {
  const [products, setProducts] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [searchName, setSearchName] = useState('');
  const [sortField, setSortField] = useState('reception_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadPurchaseHistory();
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      const { data: productTypes, error: ptError } = await supabase
        .from('product_types')
        .select('id')
        .eq('name', 'Matières Premières')
        .maybeSingle();

      if (ptError) throw ptError;

      const { data, error } = await supabase
        .from('products')
        .select('id, name, reference, unit, product_types(name)')
        .eq('product_type_id', productTypes?.id)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      alert('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_reception_lines')
        .select(`
          id,
          quantity_received,
          quantity_accepted,
          quantity_rejected,
          rejection_reason,
          batch_number,
          expiry_date,
          purchase_receptions(
            reception_number,
            reception_date,
            storage_locations(name),
            purchase_orders(
              order_number,
              order_date,
              suppliers(name, contact_person, phone)
            )
          ),
          products(name, reference, unit),
          purchase_order_lines(
            quantity_ordered,
            unit_price,
            vat_rate,
            total_line
          )
        `)
        .eq('product_id', selectedProduct)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchaseHistory(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      alert('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchName.toLowerCase()) ||
    (product.reference && product.reference.toLowerCase().includes(searchName.toLowerCase()))
  ).slice(0, 10);

  const handleProductSelect = (product) => {
    setSelectedProduct(product.id);
    setSearchName(product.name);
    setShowDropdown(false);
  };

  const handleSearchChange = (e) => {
    setSearchName(e.target.value);
    setShowDropdown(true);
    if (e.target.value === '') {
      setSelectedProduct('');
    }
  };

  const sortedHistory = [...purchaseHistory].sort((a, b) => {
    let aValue, bValue;

    switch (sortField) {
      case 'reception_date':
        aValue = a.purchase_receptions?.reception_date || '';
        bValue = b.purchase_receptions?.reception_date || '';
        break;
      case 'supplier':
        aValue = a.purchase_receptions?.purchase_orders?.suppliers?.name || '';
        bValue = b.purchase_receptions?.purchase_orders?.suppliers?.name || '';
        break;
      case 'unit_price':
        aValue = a.purchase_order_lines?.unit_price || 0;
        bValue = b.purchase_order_lines?.unit_price || 0;
        break;
      case 'quantity_accepted':
        aValue = a.quantity_accepted || 0;
        bValue = b.quantity_accepted || 0;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const calculatePriceTTC = (priceHT, vatRate) => {
    return (priceHT * (1 + vatRate / 100)).toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  if (loading && !selectedProduct) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="purchase-history-page">
      <div className="page-header">
        <h1>Historique des Achats par Produit</h1>
      </div>

      <div className="product-selector">
        <div className="search-section">
          <div className="search-autocomplete">
            <input
              type="text"
              placeholder="Tapez le nom d'un produit..."
              value={searchName}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              className="search-input"
              autoComplete="off"
            />
            {showDropdown && searchName && filteredProducts.length > 0 && (
              <div className="autocomplete-dropdown">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="autocomplete-item"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="product-name">{product.name}</div>
                    <div className="product-meta">
                      {product.reference && <span className="product-ref">{product.reference}</span>}
                      <span className="product-type">{product.product_types?.name || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showDropdown && searchName && filteredProducts.length === 0 && (
              <div className="autocomplete-dropdown">
                <div className="autocomplete-item no-results">
                  Aucun produit trouvé
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <div className="history-section">
          {loading ? (
            <div className="loading">Chargement de l'historique...</div>
          ) : sortedHistory.length === 0 ? (
            <div className="no-data">
              <p>Aucun historique d'achat pour ce produit</p>
              <small>Les achats apparaîtront ici après validation des réceptions</small>
            </div>
          ) : (
            <>
              <div className="history-summary">
                <div className="summary-card">
                  <h3>Nombre d'achats</h3>
                  <p className="summary-value">{sortedHistory.length}</p>
                </div>
                <div className="summary-card">
                  <h3>Quantité totale reçue</h3>
                  <p className="summary-value">
                    {sortedHistory.reduce((sum, h) => sum + (parseFloat(h.quantity_accepted) || 0), 0).toFixed(2)} {sortedHistory[0]?.products?.unit}
                  </p>
                </div>
                <div className="summary-card">
                  <h3>Prix moyen HT</h3>
                  <p className="summary-value">
                    {(sortedHistory.reduce((sum, h) => sum + (parseFloat(h.purchase_order_lines?.unit_price) || 0), 0) / sortedHistory.length).toFixed(2)} F
                  </p>
                </div>
                <div className="summary-card">
                  <h3>Nombre de fournisseurs</h3>
                  <p className="summary-value">
                    {new Set(sortedHistory.map(h => h.purchase_receptions?.purchase_orders?.suppliers?.name)).size}
                  </p>
                </div>
              </div>

              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('reception_date')} style={{ cursor: 'pointer' }}>
                        Date réception {sortField === 'reception_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>N° Réception</th>
                      <th>N° Commande</th>
                      <th onClick={() => handleSort('supplier')} style={{ cursor: 'pointer' }}>
                        Fournisseur {sortField === 'supplier' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('quantity_accepted')} style={{ cursor: 'pointer' }}>
                        Qté acceptée {sortField === 'quantity_accepted' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Qté rejetée</th>
                      <th onClick={() => handleSort('unit_price')} style={{ cursor: 'pointer' }}>
                        Prix unitaire HT {sortField === 'unit_price' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Prix unitaire TTC</th>
                      <th>TVA</th>
                      <th>N° Lot</th>
                      <th>Date expiration</th>
                      <th>Dépôt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.map(history => {
                      const priceHT = history.purchase_order_lines?.unit_price || 0;
                      const vatRate = history.purchase_order_lines?.vat_rate || 0;
                      const priceTTC = calculatePriceTTC(priceHT, vatRate);

                      return (
                        <tr key={history.id}>
                          <td>{formatDate(history.purchase_receptions?.reception_date)}</td>
                          <td>{history.purchase_receptions?.reception_number || '-'}</td>
                          <td>{history.purchase_receptions?.purchase_orders?.order_number || '-'}</td>
                          <td>
                            <div className="supplier-info">
                              <strong>{history.purchase_receptions?.purchase_orders?.suppliers?.name || '-'}</strong>
                              {history.purchase_receptions?.purchase_orders?.suppliers?.contact_person && (
                                <small>{history.purchase_receptions?.purchase_orders?.suppliers?.contact_person}</small>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="quantity-badge">
                              {history.quantity_accepted} {history.products?.unit}
                            </span>
                          </td>
                          <td>
                            {history.quantity_rejected > 0 ? (
                              <span className="quantity-rejected">
                                {history.quantity_rejected} {history.products?.unit}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="price-cell">{priceHT.toFixed(2)} F</td>
                          <td className="price-cell-ttc">{priceTTC} F</td>
                          <td>{vatRate}%</td>
                          <td>{history.batch_number || '-'}</td>
                          <td>{formatDate(history.expiry_date)}</td>
                          <td>{history.purchase_receptions?.storage_locations?.name || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
