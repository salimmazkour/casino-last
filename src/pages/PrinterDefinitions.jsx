import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './PrinterDefinitions.css';

const PrinterDefinitions = () => {
  const [printers, setPrinters] = useState([]);
  const [salesPoints, setSalesPoints] = useState([]);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [physicalPrinterMapping, setPhysicalPrinterMapping] = useState({});
  const [manualPrinterName, setManualPrinterName] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sales_point_id: '',
    description: '',
    is_active: true,
    physical_printer: ''
  });

  useEffect(() => {
    loadData();
    loadPhysicalPrinters();
    loadPhysicalPrinterMappings();
  }, []);

  const loadPhysicalPrinters = async () => {
    try {
      console.log('🖨️ Détection des imprimantes via le service local...');

      const printerServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';

      const response = await fetch(`${printerServiceUrl}/api/printers`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.printers) {
        console.log(`✅ ${data.printers.length} imprimante(s) détectée(s):`);
        data.printers.forEach((p, index) => {
          console.log(`   ${index + 1}. ${p.name} ${p.isDefault ? '⭐' : ''}`);
        });

        const printerNames = data.printers.map(p => p.name);
        setAvailablePrinters(printerNames);
      } else {
        console.warn('⚠️ Aucune imprimante retournée par le service');
        setAvailablePrinters([]);
      }

    } catch (error) {
      console.error('❌ Erreur connexion au service d\'impression local:', error.message);
      console.error('');
      console.error('🔧 IMPORTANT: Le service d\'impression LOCAL doit être démarré sur ce PC !');
      console.error('');
      console.error('📋 Pour démarrer le service:');
      console.error('   1. Ouvrir un terminal (CMD)');
      console.error('   2. cd C:\\ERP-Casino\\printer-service');
      console.error('   3. npm start');
      console.error('');
      console.error('💡 Ou installez-le en tant que service Windows avec INSTALLER-SERVICE.bat');
      console.error('');
      console.error('Le service doit tourner sur http://localhost:3001');
      console.error('');

      alert('⚠️ SERVICE D\'IMPRESSION NON DÉTECTÉ\n\nLe service d\'impression local n\'est pas démarré sur ce PC.\n\nVeuillez suivre les instructions dans printer-service/INSTALLATION_RAPIDE.md\n\nOu démarrez-le manuellement:\n1. Ouvrez un terminal\n2. cd printer-service\n3. npm start');

      const savedCustomPrinters = localStorage.getItem('custom_printers');
      if (savedCustomPrinters) {
        const customList = JSON.parse(savedCustomPrinters);
        console.log('📂 Chargement des imprimantes personnalisées en fallback:', customList);
        setAvailablePrinters(customList);
      } else {
        setAvailablePrinters([]);
      }
    }
  };

  const loadPhysicalPrinterMappings = async () => {
    try {
      const printerServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';

      const response = await fetch(`${printerServiceUrl}/api/mapping`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.mapping) {
        console.log('📋 Mappings chargés depuis le service:', data.mapping);
        setPhysicalPrinterMapping(data.mapping);
      }
    } catch (error) {
      console.error('❌ Erreur chargement mappings depuis le service:', error);
      console.log('📂 Fallback: tentative de chargement depuis localStorage');

      const mappings = localStorage.getItem('printer_physical_mappings');
      if (mappings) {
        setPhysicalPrinterMapping(JSON.parse(mappings));
      }
    }
  };

  const refreshPrinters = async () => {
    console.log('🔄 Actualisation de la liste des imprimantes...');
    await loadPhysicalPrinters();
  };

  const addManualPrinter = () => {
    if (!manualPrinterName.trim()) {
      alert('Veuillez entrer un nom d\'imprimante');
      return;
    }

    const customPrinters = [...availablePrinters];
    if (!customPrinters.includes(manualPrinterName.trim())) {
      customPrinters.push(manualPrinterName.trim());
      setAvailablePrinters(customPrinters);
      localStorage.setItem('custom_printers', JSON.stringify(customPrinters));
      console.log('Imprimante ajoutée:', manualPrinterName.trim());
    }

    setManualPrinterName('');
    setShowManualInput(false);
    alert('Imprimante ajoutée avec succès !');
  };

  const savePhysicalPrinterMapping = async (printerId, physicalPrinter) => {
    try {
      if (!physicalPrinter) {
        console.warn('⚠️ Pas d\'imprimante physique à sauvegarder');
        return;
      }

      const printerServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';

      const response = await fetch(`${printerServiceUrl}/api/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logicalPrinterId: printerId,
          physicalPrinterName: physicalPrinter
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.mapping) {
        console.log('✅ Mapping sauvegardé dans le service:', printerId, '→', physicalPrinter);
        setPhysicalPrinterMapping(data.mapping);

        localStorage.setItem('printer_physical_mappings', JSON.stringify(data.mapping));
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde mapping dans le service:', error);
      console.log('📂 Fallback: sauvegarde dans localStorage');

      const mappings = {...physicalPrinterMapping};
      if (physicalPrinter) {
        mappings[printerId] = physicalPrinter;
      } else {
        delete mappings[printerId];
      }
      localStorage.setItem('printer_physical_mappings', JSON.stringify(mappings));
      setPhysicalPrinterMapping(mappings);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [printersRes, salesPointsRes] = await Promise.all([
        supabase
          .from('printer_definitions')
          .select(`
            *,
            sales_points (name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('sales_points')
          .select('id, name')
          .order('name')
      ]);

      if (printersRes.data) setPrinters(printersRes.data);
      if (salesPointsRes.data) setSalesPoints(salesPointsRes.data);
    } catch (error) {
      console.error('Erreur chargement:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.sales_point_id) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const dataToSave = {
        name: formData.name,
        sales_point_id: formData.sales_point_id,
        description: formData.description || null,
        is_active: formData.is_active,
        physical_printer_name: formData.physical_printer || null
      };

      let printerId;

      if (editingPrinter) {
        const { error } = await supabase
          .from('printer_definitions')
          .update(dataToSave)
          .eq('id', editingPrinter.id);

        if (error) throw error;
        printerId = editingPrinter.id;
        alert('Imprimante modifiée avec succès');
      } else {
        const { data, error } = await supabase
          .from('printer_definitions')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        printerId = data.id;
        alert('Imprimante créée avec succès');
      }

      if (formData.physical_printer) {
        savePhysicalPrinterMapping(printerId, formData.physical_printer);
      }

      setShowModal(false);
      setEditingPrinter(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const handleEdit = (printer) => {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      sales_point_id: printer.sales_point_id,
      description: printer.description || '',
      is_active: printer.is_active,
      physical_printer: printer.physical_printer_name || physicalPrinterMapping[printer.id] || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette imprimante ?\nLes modèles d\'impression associés seront également supprimés.')) return;

    try {
      const { error } = await supabase
        .from('printer_definitions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Imprimante supprimée');
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sales_point_id: '',
      description: '',
      is_active: true,
      physical_printer: ''
    });
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="printer-definitions-container">
      <div className="page-header">
        <div className="header-content">
          <h2>Gestion des Imprimantes Logiques</h2>
          <p className="header-subtitle">
            Définissez les imprimantes logiques pour chaque point de vente.
            Le mapping vers les imprimantes physiques se fera localement sur chaque POS.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-secondary"
            onClick={async () => {
              await loadPhysicalPrinterMappings();
              await loadData();
              alert('Mappings rechargés !');
            }}
          >
            🔄 Recharger les mappings
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setEditingPrinter(null);
              resetForm();
              setShowModal(true);
            }}
          >
            + Nouvelle imprimante
          </button>
        </div>
      </div>

      <div className="printers-list">
        {printers.length === 0 ? (
          <div className="no-data">
            <p>Aucune imprimante définie</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              Créer la première imprimante
            </button>
          </div>
        ) : (
          <table className="printers-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Point de vente</th>
                <th>Imprimante physique</th>
                <th>Description</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {printers.map(printer => (
                <tr key={printer.id} className={!printer.is_active ? 'inactive-row' : ''}>
                  <td className="printer-name">
                    <strong>{printer.name}</strong>
                  </td>
                  <td>
                    {printer.sales_points ? printer.sales_points.name : '-'}
                  </td>
                  <td className="printer-physical">
                    {physicalPrinterMapping[printer.id] ? (
                      <span className="physical-mapped">{physicalPrinterMapping[printer.id]}</span>
                    ) : (
                      <span className="no-mapping">Non configurée</span>
                    )}
                  </td>
                  <td className="printer-description">
                    {printer.description || '-'}
                  </td>
                  <td>
                    <span className={`status-badge ${printer.is_active ? 'active' : 'inactive'}`}>
                      {printer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(printer)}
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(printer.id)}
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPrinter ? 'Modifier l\'imprimante' : 'Nouvelle imprimante'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom de l'imprimante *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Ex: Cuisine Chaud Seven Seven"
                />
                <small>Le nom doit être descriptif et unique</small>
              </div>

              <div className="form-group">
                <label>Point de vente *</label>
                <select
                  value={formData.sales_point_id}
                  onChange={e => setFormData({...formData, sales_point_id: e.target.value})}
                  required
                >
                  <option value="">Sélectionnez un point de vente</option>
                  {salesPoints.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Imprimante physique *</label>

                <div className="printer-actions-row">
                  <button
                    type="button"
                    className="btn-usb-access"
                    onClick={refreshPrinters}
                  >
                    🔄 Actualiser la liste
                  </button>
                  <button
                    type="button"
                    className="btn-manual-add"
                    onClick={() => setShowManualInput(!showManualInput)}
                  >
                    ✏️ Ajouter manuellement
                  </button>
                </div>

                {showManualInput && (
                  <div className="manual-printer-input">
                    <input
                      type="text"
                      value={manualPrinterName}
                      onChange={e => setManualPrinterName(e.target.value)}
                      placeholder="Nom exact de l'imprimante (ex: EPSON TM-T20III)"
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addManualPrinter())}
                    />
                    <button type="button" onClick={addManualPrinter} className="btn-add-printer">
                      ➕ Ajouter
                    </button>
                  </div>
                )}

                <select
                  value={formData.physical_printer}
                  onChange={e => setFormData({...formData, physical_printer: e.target.value})}
                  required
                >
                  <option value="">Sélectionnez une imprimante physique</option>
                  {availablePrinters.length === 0 && (
                    <option disabled>Aucune imprimante détectée - Ajoutez-en manuellement</option>
                  )}
                  {availablePrinters.map(printer => (
                    <option key={printer} value={printer}>{printer}</option>
                  ))}
                </select>
                <small>💡 Le service d'impression local doit être démarré sur CE PC (voir INSTALLATION_RAPIDE.md)</small>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Description optionnelle de l'imprimante"
                  rows="3"
                />
              </div>

              <div className="form-group-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Imprimante active
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingPrinter ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterDefinitions;
