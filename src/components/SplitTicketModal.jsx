import { useState, useEffect } from 'react';
import './SplitTicketModal.css';

export default function SplitTicketModal({ cart, totals, onClose, onSplit }) {
  const [splitMode, setSplitMode] = useState('amount');
  const [amountSplits, setAmountSplits] = useState([
    { id: 1, amount: '' },
    { id: 2, amount: '' }
  ]);
  const [productSplits, setProductSplits] = useState([
    { id: 1, items: [] },
    { id: 2, items: [] }
  ]);

  useEffect(() => {
    if (splitMode === 'product') {
      const initialSplits = [
        { id: 1, items: cart.map(item => ({ ...item, splitQuantity: 0 })) },
        { id: 2, items: cart.map(item => ({ ...item, splitQuantity: 0 })) }
      ];
      setProductSplits(initialSplits);
    }
  }, [splitMode, cart]);

  const addAmountSplit = () => {
    const newId = Math.max(...amountSplits.map(s => s.id)) + 1;
    setAmountSplits([...amountSplits, { id: newId, amount: '' }]);
  };

  const removeAmountSplit = (id) => {
    if (amountSplits.length > 2) {
      setAmountSplits(amountSplits.filter(s => s.id !== id));
    }
  };

  const updateAmountSplit = (id, amount) => {
    setAmountSplits(amountSplits.map(s =>
      s.id === id ? { ...s, amount } : s
    ));
  };

  const addProductSplit = () => {
    const newId = Math.max(...productSplits.map(s => s.id)) + 1;
    setProductSplits([
      ...productSplits,
      { id: newId, items: cart.map(item => ({ ...item, splitQuantity: 0 })) }
    ]);
  };

  const removeProductSplit = (id) => {
    if (productSplits.length > 2) {
      setProductSplits(productSplits.filter(s => s.id !== id));
    }
  };

  const updateProductQuantity = (splitId, productId, quantity) => {
    setProductSplits(productSplits.map(split => {
      if (split.id === splitId) {
        return {
          ...split,
          items: split.items.map(item =>
            item.product_id === productId
              ? { ...item, splitQuantity: Math.min(parseInt(quantity) || 0, item.quantity) }
              : item
          )
        };
      }
      return split;
    }));
  };

  const validateAmountSplit = () => {
    const totalSplit = amountSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
    if (Math.abs(totalSplit - totals.total) > 0.01) {
      alert(`Le total des montants (${totalSplit.toFixed(0)} FCFA) doit être égal au total du ticket (${totals.total.toFixed(0)} FCFA)`);
      return false;
    }
    return true;
  };

  const validateProductSplit = () => {
    for (const item of cart) {
      const totalAllocated = productSplits.reduce((sum, split) => {
        const splitItem = split.items.find(i => i.product_id === item.product_id);
        return sum + (splitItem?.splitQuantity || 0);
      }, 0);

      if (totalAllocated !== item.quantity) {
        alert(`Le produit "${item.product_name}" doit avoir toutes ses quantités réparties (${totalAllocated}/${item.quantity})`);
        return false;
      }
    }
    return true;
  };

  const handleSplit = () => {
    if (splitMode === 'amount') {
      if (!validateAmountSplit()) return;

      const splits = amountSplits
        .filter(s => parseFloat(s.amount) > 0)
        .map(split => ({
          amount: parseFloat(split.amount),
          items: cart.map(item => {
            const ratio = parseFloat(split.amount) / totals.total;
            return {
              ...item,
              quantity: Math.round(item.quantity * ratio * 100) / 100
            };
          })
        }));

      onSplit(splits);
    } else {
      if (!validateProductSplit()) return;

      const splits = productSplits
        .map(split => {
          const items = split.items
            .filter(item => item.splitQuantity > 0)
            .map(item => ({
              ...item,
              quantity: item.splitQuantity
            }));

          const amount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

          return { amount, items };
        })
        .filter(split => split.items.length > 0);

      onSplit(splits);
    }
  };

  const getRemainingQuantity = (productId) => {
    const item = cart.find(i => i.product_id === productId);
    const allocated = productSplits.reduce((sum, split) => {
      const splitItem = split.items.find(i => i.product_id === productId);
      return sum + (splitItem?.splitQuantity || 0);
    }, 0);
    return item.quantity - allocated;
  };

  const getTotalSplitAmount = () => {
    return amountSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  };

  // Protection contre totals undefined après les hooks
  if (!totals || typeof totals.total === 'undefined') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content split-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Erreur</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Impossible de diviser un ticket vide.</p>
            <button
              onClick={onClose}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content split-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Diviser le ticket</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="split-mode-toggle">
          <button
            className={splitMode === 'amount' ? 'active' : ''}
            onClick={() => setSplitMode('amount')}
          >
            Par montant
          </button>
          <button
            className={splitMode === 'product' ? 'active' : ''}
            onClick={() => setSplitMode('product')}
          >
            Par produit
          </button>
        </div>

        <div className="split-info">
          <div className="info-item">
            <span>Total du ticket:</span>
            <strong>{totals.total.toFixed(0)} FCFA</strong>
          </div>
        </div>

        <div className="split-content">
          {splitMode === 'amount' ? (
            <div className="amount-splits">
              {amountSplits.map((split, index) => (
                <div key={split.id} className="split-row">
                  <label>Ticket {index + 1}:</label>
                  <input
                    type="number"
                    value={split.amount}
                    onChange={(e) => updateAmountSplit(split.id, e.target.value)}
                    placeholder="Montant"
                    min="0"
                  />
                  <span>FCFA</span>
                  {amountSplits.length > 2 && (
                    <button
                      className="btn-remove-split"
                      onClick={() => removeAmountSplit(split.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <div className="split-summary">
                <span>Total réparti:</span>
                <strong className={Math.abs(getTotalSplitAmount() - totals.total) < 0.01 ? 'valid' : 'invalid'}>
                  {getTotalSplitAmount().toFixed(0)} FCFA
                </strong>
              </div>

              <button className="btn-add-split" onClick={addAmountSplit}>
                + Ajouter un ticket
              </button>
            </div>
          ) : (
            <div className="product-splits">
              {productSplits.map((split, splitIndex) => (
                <div key={split.id} className="product-split-section">
                  <div className="split-section-header">
                    <h4>Ticket {splitIndex + 1}</h4>
                    {productSplits.length > 2 && (
                      <button
                        className="btn-remove-split"
                        onClick={() => removeProductSplit(split.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {split.items.map(item => (
                    <div key={item.product_id} className="product-split-row">
                      <div className="product-info">
                        <span className="product-name">{item.product_name}</span>
                        <span className="product-available">
                          (reste: {getRemainingQuantity(item.product_id)})
                        </span>
                      </div>
                      <input
                        type="number"
                        value={item.splitQuantity || ''}
                        onChange={(e) => updateProductQuantity(split.id, item.product_id, e.target.value)}
                        placeholder="0"
                        min="0"
                        max={item.quantity}
                      />
                    </div>
                  ))}

                  <div className="split-total">
                    Total: {split.items.reduce((sum, item) =>
                      sum + (item.unit_price * (item.splitQuantity || 0)), 0
                    ).toFixed(0)} FCFA
                  </div>
                </div>
              ))}

              <button className="btn-add-split" onClick={addProductSplit}>
                + Ajouter un ticket
              </button>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-primary" onClick={handleSplit}>
            Diviser et créer les tickets
          </button>
        </div>
      </div>
    </div>
  );
}
