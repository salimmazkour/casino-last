import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './ProductOptionsModal.css';

export default function ProductOptionsModal({ product, onClose, onConfirm }) {
  const [optionGroups, setOptionGroups] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    loadProductOptions();
  }, [product.id]);

  async function loadProductOptions() {
    try {
      const { data: assignments, error } = await supabase
        .from('product_option_group_assignments')
        .select(`
          *,
          option_groups (
            id,
            name,
            selection_type,
            option_group_items (
              id,
              name,
              option_type,
              price_adjustment,
              linked_product_id,
              display_order,
              products (id, name, selling_price)
            )
          )
        `)
        .eq('product_id', product.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const sortedGroups = (assignments || []).map(assignment => ({
        ...assignment,
        option_groups: {
          ...assignment.option_groups,
          option_group_items: (assignment.option_groups.option_group_items || [])
            .sort((a, b) => a.display_order - b.display_order)
        }
      }));

      setOptionGroups(sortedGroups);

      const initialSelections = {};
      sortedGroups.forEach(group => {
        initialSelections[group.id] = [];
      });
      setSelections(initialSelections);

      setLoading(false);
    } catch (error) {
      console.error('Error loading product options:', error);
      alert('Erreur lors du chargement des options');
      setLoading(false);
    }
  }

  function handleSingleSelection(groupId, itemId) {
    setSelections({
      ...selections,
      [groupId]: [itemId]
    });
    setValidationErrors([]);
  }

  function handleMultipleSelection(groupId, itemId) {
    const currentSelections = selections[groupId] || [];
    const isSelected = currentSelections.includes(itemId);

    if (isSelected) {
      setSelections({
        ...selections,
        [groupId]: currentSelections.filter(id => id !== itemId)
      });
    } else {
      setSelections({
        ...selections,
        [groupId]: [...currentSelections, itemId]
      });
    }
    setValidationErrors([]);
  }

  function calculateTotalPrice() {
    let total = parseFloat(product.selling_price || 0);

    optionGroups.forEach(group => {
      const selectedItems = selections[group.id] || [];

      selectedItems.forEach((itemId, index) => {
        const item = group.option_groups.option_group_items.find(i => i.id === itemId);
        if (!item) return;

        const selectionIndex = index + 1;

        if (selectionIndex <= group.included_selections) {
          return;
        }

        if (item.option_type === 'fixed_price') {
          total += parseFloat(item.price_adjustment || 0);
        } else if (item.option_type === 'product_based' && item.products) {
          total += parseFloat(item.products.selling_price || 0);
        }
      });
    });

    return total;
  }

  function getItemPrice(group, item, selectionIndex) {
    if (selectionIndex <= group.included_selections) {
      return { price: 0, display: 'Inclus', isIncluded: true };
    }

    if (item.option_type === 'fixed_price') {
      const price = parseFloat(item.price_adjustment || 0);
      return {
        price,
        display: price > 0 ? `+${price.toFixed(2)}€` : 'Inclus',
        isIncluded: price === 0
      };
    }

    if (item.option_type === 'product_based' && item.products) {
      const price = parseFloat(item.products.selling_price || 0);
      return {
        price,
        display: `+${price.toFixed(2)}€`,
        isIncluded: false
      };
    }

    return { price: 0, display: '', isIncluded: true };
  }

  function validateSelections() {
    const errors = [];

    optionGroups.forEach(group => {
      const selectedCount = (selections[group.id] || []).length;

      if (group.is_required && selectedCount < group.min_selections) {
        errors.push(
          `"${group.option_groups.name}" : minimum ${group.min_selections} choix requis`
        );
      }

      if (selectedCount > group.max_selections) {
        errors.push(
          `"${group.option_groups.name}" : maximum ${group.max_selections} choix autorisés`
        );
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }

  function handleConfirm() {
    if (!validateSelections()) {
      return;
    }

    const optionsData = [];

    optionGroups.forEach(group => {
      const selectedItems = selections[group.id] || [];

      selectedItems.forEach((itemId, index) => {
        const item = group.option_groups.option_group_items.find(i => i.id === itemId);
        if (!item) return;

        const selectionIndex = index + 1;
        const priceInfo = getItemPrice(group, item, selectionIndex);

        optionsData.push({
          option_item_id: item.id,
          option_name: item.name,
          group_name: group.option_groups.name,
          selection_index: selectionIndex,
          price_applied: priceInfo.price,
          option_type: item.option_type,
          linked_product_id: item.linked_product_id
        });
      });
    });

    onConfirm({
      product,
      options: optionsData,
      totalPrice: calculateTotalPrice()
    });
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-body">
            <p>Chargement des options...</p>
          </div>
        </div>
      </div>
    );
  }

  if (optionGroups.length === 0) {
    onConfirm({
      product,
      options: [],
      totalPrice: parseFloat(product.selling_price || 0)
    });
    return null;
  }

  const totalPrice = calculateTotalPrice();
  const optionsPrice = totalPrice - parseFloat(product.selling_price || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content product-options-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{product.name}</h2>
            <p className="product-base-price">Prix de base: {parseFloat(product.selling_price || 0).toFixed(2)}€</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {validationErrors.length > 0 && (
            <div className="validation-errors">
              {validationErrors.map((error, index) => (
                <div key={index} className="error-message">{error}</div>
              ))}
            </div>
          )}

          {optionGroups.map(group => {
            const selectedCount = (selections[group.id] || []).length;
            const remainingIncluded = Math.max(0, group.included_selections - selectedCount);

            return (
              <div key={group.id} className="option-group">
                <div className="option-group-header">
                  <h3>
                    {group.option_groups.name}
                    {group.is_required && <span className="required-badge">*</span>}
                  </h3>
                  <div className="option-group-info">
                    {group.option_groups.selection_type === 'single' ? (
                      <span className="selection-info">Choix unique</span>
                    ) : (
                      <span className="selection-info">
                        {group.min_selections} à {group.max_selections} choix
                        {group.included_selections > 0 && (
                          <span className="included-info">
                            {' '}({group.included_selections} inclus)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="option-items">
                  {group.option_groups.option_group_items.map((item, itemIndex) => {
                    const isSelected = (selections[group.id] || []).includes(item.id);
                    const currentSelectionIndex = isSelected
                      ? (selections[group.id] || []).indexOf(item.id) + 1
                      : selectedCount + 1;

                    const priceInfo = getItemPrice(group, item, currentSelectionIndex);

                    return (
                      <label
                        key={item.id}
                        className={`option-item ${isSelected ? 'selected' : ''}`}
                      >
                        {group.option_groups.selection_type === 'single' ? (
                          <input
                            type="radio"
                            name={`group-${group.id}`}
                            checked={isSelected}
                            onChange={() => handleSingleSelection(group.id, item.id)}
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleMultipleSelection(group.id, item.id)}
                            disabled={!isSelected && selectedCount >= group.max_selections}
                          />
                        )}

                        <span className="option-name">{item.name}</span>

                        {isSelected && priceInfo.display && (
                          <span className={`option-price ${priceInfo.isIncluded ? 'included' : 'additional'}`}>
                            {priceInfo.display}
                            {priceInfo.isIncluded && selectedCount <= group.included_selections && (
                              <span className="inclusion-count"> ({currentSelectionIndex}/{group.included_selections})</span>
                            )}
                          </span>
                        )}

                        {!isSelected && !priceInfo.isIncluded && (
                          <span className="option-price-preview">
                            {currentSelectionIndex <= group.included_selections
                              ? `Inclus (${currentSelectionIndex}/${group.included_selections})`
                              : priceInfo.display}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <div className="price-summary">
            <div className="price-row">
              <span>Prix de base:</span>
              <span>{parseFloat(product.selling_price || 0).toFixed(2)}€</span>
            </div>
            {optionsPrice > 0 && (
              <div className="price-row">
                <span>Options:</span>
                <span>+{optionsPrice.toFixed(2)}€</span>
              </div>
            )}
            <div className="price-row total">
              <span>TOTAL:</span>
              <span>{totalPrice.toFixed(2)}€</span>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button className="btn-primary" onClick={handleConfirm}>
              Ajouter à la commande
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
