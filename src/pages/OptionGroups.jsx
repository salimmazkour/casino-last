import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './OptionGroups.css';

export default function OptionGroups() {
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selection_type: 'single',
    items: []
  });

  useEffect(() => {
    loadGroups();
    loadProducts();
  }, []);

  async function loadGroups() {
    const { data, error } = await supabase
      .from('option_groups')
      .select(`
        *,
        option_group_items (
          id,
          name,
          option_type,
          price_adjustment,
          linked_product_id,
          display_order,
          products (name)
        )
      `)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading groups:', error);
      alert('Erreur lors du chargement des groupes');
    } else {
      setGroups(data || []);
    }
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, selling_price')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
    } else {
      setProducts(data || []);
    }
  }

  function openCreateModal() {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      selection_type: 'single',
      items: []
    });
    setShowModal(true);
  }

  function openEditModal(group) {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      selection_type: group.selection_type,
      items: (group.option_group_items || []).sort((a, b) => a.display_order - b.display_order)
    });
    setShowModal(true);
  }

  function addItem() {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          name: '',
          option_type: 'fixed_price',
          price_adjustment: 0,
          linked_product_id: null,
          display_order: formData.items.length
        }
      ]
    });
  }

  function updateItem(index, field, value) {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  }

  function removeItem(index) {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  }

  async function saveGroup() {
    if (!formData.name.trim()) {
      alert('Le nom du groupe est obligatoire');
      return;
    }

    if (formData.items.length === 0) {
      alert('Ajoutez au moins une option');
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.name.trim()) {
        alert(`L'option ${i + 1} doit avoir un nom`);
        return;
      }
      if (item.option_type === 'product_based' && !item.linked_product_id) {
        alert(`L'option ${i + 1} doit être liée à un produit`);
        return;
      }
    }

    try {
      let groupId;

      if (editingGroup) {
        const { error: updateError } = await supabase
          .from('option_groups')
          .update({
            name: formData.name,
            description: formData.description,
            selection_type: formData.selection_type
          })
          .eq('id', editingGroup.id);

        if (updateError) throw updateError;
        groupId = editingGroup.id;

        const { error: deleteError } = await supabase
          .from('option_group_items')
          .delete()
          .eq('option_group_id', groupId);

        if (deleteError) throw deleteError;
      } else {
        const { data: newGroup, error: insertError } = await supabase
          .from('option_groups')
          .insert({
            name: formData.name,
            description: formData.description,
            selection_type: formData.selection_type,
            display_order: groups.length
          })
          .select()
          .single();

        if (insertError) throw insertError;
        groupId = newGroup.id;
      }

      const items = formData.items.map((item, index) => ({
        option_group_id: groupId,
        name: item.name,
        option_type: item.option_type,
        price_adjustment: item.option_type === 'fixed_price' ? parseFloat(item.price_adjustment) || 0 : 0,
        linked_product_id: item.option_type === 'product_based' ? item.linked_product_id : null,
        display_order: index
      }));

      const { error: itemsError } = await supabase
        .from('option_group_items')
        .insert(items);

      if (itemsError) throw itemsError;

      setShowModal(false);
      loadGroups();
      alert(editingGroup ? 'Groupe modifié avec succès' : 'Groupe créé avec succès');
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  }

  async function deleteGroup(groupId) {
    if (!confirm('Supprimer ce groupe d\'options ?')) return;

    const { error } = await supabase
      .from('option_groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      console.error('Error deleting group:', error);
      alert('Erreur lors de la suppression');
    } else {
      loadGroups();
    }
  }

  return (
    <div className="option-groups-page">
      <div className="page-header">
        <h1>Groupes d'Options</h1>
        <button className="btn-primary" onClick={openCreateModal}>
          + Nouveau Groupe
        </button>
      </div>

      <div className="groups-list">
        {groups.length === 0 ? (
          <div className="empty-state">
            <p>Aucun groupe d'options créé</p>
            <button className="btn-primary" onClick={openCreateModal}>
              Créer le premier groupe
            </button>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="group-card">
              <div className="group-header">
                <div>
                  <h3>{group.name}</h3>
                  {group.description && <p className="group-description">{group.description}</p>}
                  <span className="group-type">
                    {group.selection_type === 'single' ? 'Choix unique' : 'Choix multiples'}
                  </span>
                </div>
                <div className="group-actions">
                  <button className="btn-secondary" onClick={() => openEditModal(group)}>
                    Modifier
                  </button>
                  <button className="btn-danger" onClick={() => deleteGroup(group.id)}>
                    ❌
                  </button>
                </div>
              </div>
              <div className="group-items">
                <strong>{group.option_group_items?.length || 0} options:</strong>
                <ul>
                  {(group.option_group_items || []).map(item => (
                    <li key={item.id}>
                      {item.name}
                      {item.option_type === 'fixed_price' && (
                        <span className="item-price">
                          {item.price_adjustment > 0 ? `+${item.price_adjustment}€` : 'Inclus'}
                        </span>
                      )}
                      {item.option_type === 'product_based' && (
                        <span className="item-product">
                          → {item.products?.name || 'Produit'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGroup ? 'Modifier le Groupe' : 'Nouveau Groupe'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nom du groupe *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cuisson, Accompagnements, Garnitures..."
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description optionnelle"
                />
              </div>

              <div className="form-group">
                <label>Type de sélection *</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      checked={formData.selection_type === 'single'}
                      onChange={() => setFormData({ ...formData, selection_type: 'single' })}
                    />
                    Choix unique
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={formData.selection_type === 'multiple'}
                      onChange={() => setFormData({ ...formData, selection_type: 'multiple' })}
                    />
                    Choix multiples
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Options</label>
                <div className="items-list">
                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => updateItem(index, 'name', e.target.value)}
                        placeholder="Nom de l'option"
                      />

                      <select
                        value={item.option_type}
                        onChange={e => updateItem(index, 'option_type', e.target.value)}
                      >
                        <option value="fixed_price">Prix fixe</option>
                        <option value="product_based">Basé sur produit</option>
                      </select>

                      {item.option_type === 'fixed_price' ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.price_adjustment}
                          onChange={e => updateItem(index, 'price_adjustment', e.target.value)}
                          placeholder="0.00"
                          style={{ width: '100px' }}
                        />
                      ) : (
                        <select
                          value={item.linked_product_id || ''}
                          onChange={e => updateItem(index, 'linked_product_id', e.target.value)}
                        >
                          <option value="">-- Choisir un produit --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.selling_price}€)
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        className="btn-danger-small"
                        onClick={() => removeItem(index)}
                        title="Supprimer"
                      >
                        ❌
                      </button>
                    </div>
                  ))}

                  <button className="btn-secondary" onClick={addItem}>
                    + Ajouter une option
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button className="btn-primary" onClick={saveGroup}>
                {editingGroup ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
