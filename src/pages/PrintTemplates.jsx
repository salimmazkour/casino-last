import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './PrintTemplates.css';

const PrintTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [printerDefinitions, setPrinterDefinitions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  // Categories management removed
  const [selectedPrinterSalesPoint, setSelectedPrinterSalesPoint] = useState(null);
  const [printerServiceOnline, setPrinterServiceOnline] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    template_type: 'fabrication',
    printer_definition_id: '',
    is_active: true,
    is_cancellation_template: false,
    template_format: 'text',
    preset_id: '',
    template_content: {
      header: '',
      footer: '',
      showLogo: false,
      logoUrl: '',
      logoAlign: 'center',
      showDate: true,
      showTable: true,
      showOrderNumber: true,
      showPrices: true,
      showClientName: false,
      fontSize: 'normal',
      paperSize: '80mm',
      textStyles: {
        header: { bold: true, size: 12, align: 'center' },
        body: { bold: false, size: 10, align: 'left' },
        footer: { bold: false, size: 9, align: 'center' }
      }
    }
  });

  useEffect(() => {
    loadData();
    checkPrinterService();
  }, []);

  const checkPrinterService = async () => {
    try {
      const printerServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';
      const response = await fetch(`${printerServiceUrl}/api/printers`, {
        signal: AbortSignal.timeout(3000)
      });
      setPrinterServiceOnline(response.ok);
    } catch (error) {
      setPrinterServiceOnline(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [templatesRes, printersRes, categoriesRes, presetsRes] = await Promise.all([
        supabase
          .from('print_templates')
          .select(`
            *,
            printer_definitions!printer_definition_id (
              name,
              sales_point_id,
              sales_points (name)
            ),
            print_template_categories (
              category_id,
              product_categories (id, name, icon)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('printer_definitions')
          .select('id, name, sales_point_id, is_active, sales_points(name)')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('product_categories')
          .select('id, name, icon, description')
          .order('name'),
        supabase
          .from('print_template_presets')
          .select('*')
          .order('name')
      ]);

      console.log('📥 Templates loaded:', templatesRes.data);
      console.log('📥 Templates error:', templatesRes.error);
      console.log('📥 Printers loaded:', printersRes.data);
      console.log('📥 Categories loaded:', categoriesRes.data);
      console.log('📥 Presets loaded:', presetsRes.data);

      if (templatesRes.error) {
        console.error('❌ Error loading templates:', templatesRes.error);
        alert('Erreur lors du chargement des modèles: ' + templatesRes.error.message);
      }

      if (printersRes.error) {
        console.error('❌ Error loading printers:', printersRes.error);
      }

      if (categoriesRes.error) {
        console.error('❌ Error loading categories:', categoriesRes.error);
      }

      if (templatesRes.data) {
        console.log('✅ Setting templates state with', templatesRes.data.length, 'items');
        setTemplates(templatesRes.data);
      }
      if (printersRes.data) setPrinterDefinitions(printersRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (presetsRes.data) setPresets(presetsRes.data);
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      alert('Erreur lors du chargement des données: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('🔍 [DEBUG] formData:', formData);
    console.log('🔍 [DEBUG] name:', formData.name, 'type:', typeof formData.name);
    console.log('🔍 [DEBUG] printer_definition_id:', formData.printer_definition_id, 'type:', typeof formData.printer_definition_id);

    if (!formData.name || !formData.printer_definition_id) {
      console.error('❌ [VALIDATION FAILED]');
      console.error('name is falsy:', !formData.name);
      console.error('printer_definition_id is falsy:', !formData.printer_definition_id);
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Category validation removed

    try {
      const dataToSave = {
        name: formData.name,
        template_type: 'fabrication',
        printer_definition_id: formData.printer_definition_id,
        is_active: formData.is_active,
        is_cancellation_template: formData.is_cancellation_template,
        template_format: formData.template_format,
        template_content: formData.template_content
      };

      let templateId;

      if (editingTemplate) {
        const { error } = await supabase
          .from('print_templates')
          .update(dataToSave)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        templateId = editingTemplate.id;
      } else {
        const { data, error } = await supabase
          .from('print_templates')
          .insert([dataToSave])
          .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Aucune donnée retournée après insertion');
        templateId = data[0].id;
      }

      // Category links removed

      alert(editingTemplate ? 'Modèle modifié avec succès' : 'Modèle créé avec succès');
      setShowModal(false);
      setEditingTemplate(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const normalizeTemplateContent = (content) => {
    const defaultContent = {
      header: '',
      footer: '',
      showLogo: false,
      logoUrl: '',
      logoAlign: 'center',
      showDate: true,
      showTable: true,
      showOrderNumber: true,
      showPrices: true,
      showClientName: false,
      fontSize: 'normal',
      paperSize: '80mm',
      paperWidth: '80mm',
      textStyles: {
        header: { bold: true, size: 12, align: 'center' },
        body: { bold: false, size: 10, align: 'left' },
        footer: { bold: false, size: 9, align: 'center' }
      }
    };

    if (!content) return defaultContent;

    return {
      ...defaultContent,
      ...content,
      textStyles: {
        header: { ...defaultContent.textStyles.header, ...(content.textStyles?.header || {}) },
        body: { ...defaultContent.textStyles.body, ...(content.textStyles?.body || {}) },
        footer: { ...defaultContent.textStyles.footer, ...(content.textStyles?.footer || {}) }
      }
    };
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template_type: template.template_type,
      printer_definition_id: template.printer_definition_id,
      is_active: template.is_active,
      is_cancellation_template: template.is_cancellation_template || false,
      template_format: template.template_format || 'text',
      template_content: normalizeTemplateContent(template.template_content)
    });

    // Category loading removed

    if (template.printer_definitions) {
      const salesPointName = template.printer_definitions.sales_points?.name;
      setSelectedPrinterSalesPoint(salesPointName);
    }

    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle d\'impression ?')) return;

    try {
      const { error } = await supabase
        .from('print_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Modèle supprimé');
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  // toggleCategory removed

  const resetForm = () => {
    setFormData({
      name: '',
      template_type: 'fabrication',
      printer_definition_id: '',
      is_active: true,
      is_cancellation_template: false,
      template_format: 'text',
      preset_id: '',
      template_content: normalizeTemplateContent(null)
    });
    setSelectedPrinterSalesPoint(null);
  };

  const getTypeLabel = (type) => {
    return type === 'caisse' ? 'Ticket de Caisse' : 'Fabrication';
  };

  const getTypeIcon = (type) => {
    return type === 'caisse' ? '🧾' : '📋';
  };

  const handlePrinterChange = (printerId) => {
    console.log('🖨️ [PRINTER CHANGE] printerId:', printerId, 'type:', typeof printerId);
    setFormData({...formData, printer_definition_id: printerId});
    const selectedPrinter = printerDefinitions.find(p => p.id === printerId);
    console.log('🖨️ [PRINTER CHANGE] selectedPrinter:', selectedPrinter);
    if (selectedPrinter) {
      setSelectedPrinterSalesPoint(selectedPrinter.sales_points?.name || null);
    } else {
      setSelectedPrinterSalesPoint(null);
    }
  };

  const handleTemplateLoad = (templateId) => {
    if (!templateId) {
      return;
    }

    const selectedTemplate = templates.find(t => t.id === templateId);
    if (selectedTemplate) {
      setFormData({
        ...formData,
        name: selectedTemplate.name + ' (Copie)',
        template_type: selectedTemplate.template_type,
        template_format: selectedTemplate.template_format || 'text',
        template_content: normalizeTemplateContent(selectedTemplate.template_content)
      });

      // Category loading removed
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  console.log('🎨 Rendering with templates:', templates);
  console.log('🎨 Templates length:', templates.length);

  return (
    <div className="print-templates-container">
      {!printerServiceOnline && (
        <div style={{background: '#dc3545', color: 'white', padding: '15px 20px', marginBottom: '20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
          <span style={{fontSize: '24px'}}>⚠️</span>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 'bold', fontSize: '16px', marginBottom: '5px'}}>Service d'impression hors ligne</div>
            <div style={{fontSize: '14px', opacity: 0.9}}>Le service d'impression local n'est pas accessible. Les impressions ne fonctionneront pas tant qu'il n'est pas démarré.</div>
          </div>
          <button
            onClick={checkPrinterService}
            style={{background: 'white', color: '#dc3545', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'}}
          >
            🔄 Vérifier
          </button>
        </div>
      )}
      <div className="page-header">
        <div className="header-content">
          <h2>Gestion des Fonctions d'Impressions</h2>
          <p className="header-subtitle">
            Créez des modèles d'impression et associez-les à des catégories de produits.
            Les tickets de caisse impriment tous les produits, les tickets de fabrication
            impriment uniquement les produits des catégories sélectionnées.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingTemplate(null);
            resetForm();
            setShowModal(true);
          }}
        >
          + Nouveau modèle
        </button>
      </div>

      <div className="templates-grid">
        {templates.length === 0 ? (
          <div className="no-data">
            <p>Aucun modèle d'impression défini</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              Créer le premier modèle
            </button>
          </div>
        ) : (
          templates.map(template => (
            <div key={template.id} className={`template-card ${!template.is_active ? 'inactive' : ''}`}>
              <div className="template-header">
                <div className="template-icon">
                  {getTypeIcon(template.template_type)}
                </div>
                <div className="template-info">
                  <h3>
                    {template.name}
                    {template.is_cancellation_template && (
                      <span className="status-badge" style={{marginLeft: '10px', backgroundColor: '#ff9800', color: 'white', fontSize: '11px'}}>
                        ANNULATION
                      </span>
                    )}
                  </h3>
                  <span className="template-type">{getTypeLabel(template.template_type)}</span>
                </div>
              </div>

              <div className="template-details">
                <div className="detail-item">
                  <strong>Imprimante:</strong>
                  <span>{template.printer_definitions?.name || '-'}</span>
                </div>
                <div className="detail-item">
                  <strong>Point de vente:</strong>
                  <span>{template.printer_definitions?.sales_points?.name || '-'}</span>
                </div>
                <div className="detail-item">
                  <strong>Statut:</strong>
                  <span className={`status-badge ${template.is_active ? 'active' : 'inactive'}`}>
                    {template.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>


              <div className="template-actions">
                <button
                  className="btn-edit"
                  onClick={() => handleEdit(template)}
                >
                  ✏️ Modifier
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(template.id)}
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle d\'impression'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nom du modèle *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Ex: Fabrication Bar Seven Seven"
                  />
                </div>

              </div>

              <div className="form-group">
                <label>Imprimante logique *</label>
                <select
                  value={formData.printer_definition_id}
                  onChange={e => handlePrinterChange(e.target.value)}
                  required
                >
                  <option value="">Sélectionnez une imprimante</option>
                  {printerDefinitions.map(printer => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name} ({printer.sales_points?.name || 'Aucun POS'})
                    </option>
                  ))}
                </select>
                {selectedPrinterSalesPoint && (
                  <small className="info-text">
                    ✅ Point de vente: <strong>{selectedPrinterSalesPoint}</strong>
                  </small>
                )}
              </div>

              <div className="form-group-checkbox" style={{marginTop: '15px'}}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_cancellation_template}
                    onChange={e => setFormData({...formData, is_cancellation_template: e.target.checked})}
                  />
                  <span style={{fontWeight: 'bold'}}>Modèle d'annulation</span>
                </label>
                <small style={{display: 'block', marginTop: '5px', color: '#666'}}>
                  ℹ️ Si coché, ce modèle sera utilisé pour imprimer les bons d'annulation (lignes ou tickets annulés).
                  Le nom du point de vente source sera automatiquement affiché.
                </small>
              </div>

              <div className="template-customization">
                <h4>🎨 Personnalisation du ticket</h4>

                <div className="form-group">
                  <label>📋 Copier un template existant</label>
                  <select
                    onChange={e => handleTemplateLoad(e.target.value)}
                    value=""
                  >
                    <option value="">-- Sélectionnez un template à copier --</option>
                    {templates.filter(t => !editingTemplate || t.id !== editingTemplate.id).map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.template_type === 'caisse' ? 'Caisse' : 'Fabrication'})
                      </option>
                    ))}
                  </select>
                  <small>Chargez un template existant pour copier sa configuration et gagner du temps</small>
                </div>

                <div className="form-group">
                  <label>🖼️ Logo personnalisé</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setFormData({
                            ...formData,
                            template_content: {
                              ...formData.template_content,
                              logoUrl: event.target.result,
                              showLogo: true
                            }
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <small>Format PNG/JPG recommandé (évitez les fichiers .ico)</small>
                  {formData.template_content.logoUrl && (
                    <div style={{marginTop: '10px'}}>
                      <img src={formData.template_content.logoUrl} alt="Logo preview" style={{maxWidth: '100px', maxHeight: '100px'}} />
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            logoUrl: '',
                            showLogo: false
                          }
                        })}
                        style={{marginLeft: '10px', padding: '5px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Position du logo</label>
                  <select
                    value={formData.template_content.logoAlign || 'center'}
                    onChange={e => setFormData({...formData, template_content: {...formData.template_content, logoAlign: e.target.value}})}
                  >
                    <option value="left">Gauche</option>
                    <option value="center">Centre</option>
                    <option value="right">Droite</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Format d'impression</label>
                    <select
                      value={formData.template_format}
                      onChange={e => setFormData({...formData, template_format: e.target.value})}
                    >
                      <option value="text">Texte simple</option>
                      <option value="html">HTML</option>
                      <option value="escpos">ESC/POS (avancé)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Taille du papier</label>
                    <select
                      value={formData.template_content.paperSize}
                      onChange={e => setFormData({...formData, template_content: {...formData.template_content, paperSize: e.target.value}})}
                    >
                      <option value="58mm">58mm (Ticket étroit)</option>
                      <option value="80mm">80mm (Ticket standard)</option>
                      <option value="A6">A6 (105 x 148 mm)</option>
                      <option value="A5">A5 (148 x 210 mm)</option>
                      <option value="A4">A4 (210 x 297 mm)</option>
                    </select>
                  </div>
                </div>


                <div className="form-group">
                  <label>En-tête personnalisé</label>
                  <div className="text-style-options">
                    <label className="inline-option">
                      <input
                        type="checkbox"
                        checked={formData.template_content.textStyles?.header?.bold}
                        onChange={e => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              header: {
                                ...formData.template_content.textStyles.header,
                                bold: e.target.checked
                              }
                            }
                          }
                        })}
                      />
                      <strong>Gras</strong>
                    </label>
                    <label className="inline-option">
                      Taille:
                      <input
                        type="number"
                        min="8"
                        max="24"
                        value={formData.template_content.textStyles?.header?.size || 12}
                        onChange={e => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              header: {
                                ...formData.template_content.textStyles.header,
                                size: parseInt(e.target.value)
                              }
                            }
                          }
                        })}
                        style={{width: '60px', marginLeft: '5px'}}
                      />
                    </label>
                    <div className="alignment-buttons">
                      <span style={{marginRight: '5px', fontSize: '13px', color: '#555'}}>Alignement:</span>
                      <button
                        type="button"
                        className={`align-btn ${formData.template_content.textStyles?.header?.align === 'left' ? 'active' : ''}`}
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              header: {
                                ...formData.template_content.textStyles.header,
                                align: 'left'
                              }
                            }
                          }
                        })}
                        title="Aligner à gauche"
                      >
                        ☰
                      </button>
                      <button
                        type="button"
                        className={`align-btn ${formData.template_content.textStyles?.header?.align === 'center' ? 'active' : ''}`}
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              header: {
                                ...formData.template_content.textStyles.header,
                                align: 'center'
                              }
                            }
                          }
                        })}
                        title="Centrer"
                      >
                        ☷
                      </button>
                      <button
                        type="button"
                        className={`align-btn ${formData.template_content.textStyles?.header?.align === 'right' ? 'active' : ''}`}
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              header: {
                                ...formData.template_content.textStyles.header,
                                align: 'right'
                              }
                            }
                          }
                        })}
                        title="Aligner à droite"
                      >
                        ☰
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={formData.template_content.header}
                    onChange={e => setFormData({...formData, template_content: {...formData.template_content, header: e.target.value}})}
                    placeholder="Ex: CASINO CAP VERT&#10;Boavista - Sal Rei&#10;Tel: +238 251 11 56"
                    rows="4"
                  />
                  <small>Texte affiché en haut du ticket. Utilisez plusieurs lignes pour l'adresse.</small>
                </div>

                <div className="form-group">
                  <label>Corps du ticket (articles)</label>
                  <div className="text-style-options">
                    <label className="inline-option">
                      <input
                        type="checkbox"
                        checked={formData.template_content.textStyles?.body?.bold}
                        onChange={e => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              body: {
                                ...formData.template_content.textStyles.body,
                                bold: e.target.checked
                              }
                            }
                          }
                        })}
                      />
                      <strong>Gras</strong>
                    </label>
                    <label className="inline-option">
                      Taille:
                      <input
                        type="number"
                        min="8"
                        max="24"
                        value={formData.template_content.textStyles?.body?.size || 10}
                        onChange={e => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              body: {
                                ...formData.template_content.textStyles.body,
                                size: parseInt(e.target.value)
                              }
                            }
                          }
                        })}
                        style={{width: '60px', marginLeft: '5px'}}
                      />
                    </label>
                    <div className="alignment-buttons">
                      <span style={{marginRight: '5px', fontSize: '13px', color: '#555'}}>Alignement:</span>
                      <button
                        type="button"
                        className={`align-btn ${formData.template_content.textStyles?.body?.align === 'left' ? 'active' : ''}`}
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              body: {
                                ...formData.template_content.textStyles.body,
                                align: 'left'
                              }
                            }
                          }
                        })}
                        title="Aligner à gauche"
                      >
                        ☰
                      </button>
                      <button
                        type="button"
                        className={`align-btn ${formData.template_content.textStyles?.body?.align === 'center' ? 'active' : ''}`}
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              body: {
                                ...formData.template_content.textStyles.body,
                                align: 'center'
                              }
                            }
                          }
                        })}
                        title="Centrer"
                      >
                        ☷
                      </button>
                      <button
                        type="button"
                        className={`align-btn ${formData.template_content.textStyles?.body?.align === 'right' ? 'active' : ''}`}
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              body: {
                                ...formData.template_content.textStyles.body,
                                align: 'right'
                              }
                            }
                          }
                        })}
                        title="Aligner à droite"
                      >
                        ☰
                      </button>
                    </div>
                  </div>
                  <small>Style de police pour la liste des articles</small>
                </div>

                <div className="form-group">
                  <label>Pied de page personnalisé</label>
                  <div className="text-style-options">
                    <label className="inline-option">
                      <input
                        type="checkbox"
                        checked={formData.template_content.textStyles?.footer?.bold}
                        onChange={e => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              footer: {
                                ...formData.template_content.textStyles.footer,
                                bold: e.target.checked
                              }
                            }
                          }
                        })}
                      />
                      <strong>Gras</strong>
                    </label>
                    <label className="inline-option">
                      Taille:
                      <input
                        type="number"
                        min="8"
                        max="24"
                        value={formData.template_content.textStyles?.footer?.size || 9}
                        onChange={e => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              footer: {
                                ...formData.template_content.textStyles.footer,
                                size: parseInt(e.target.value)
                              }
                            }
                          }
                        })}
                        style={{width: '60px', marginLeft: '5px'}}
                      />
                    </label>
                    <div className="alignment-buttons">
                      <span style={{marginRight: '5px', fontSize: '13px', color: '#555'}}>Alignement:</span>
                      <button
                        type="button"
                        className={`align-btn ${formData.template_content.textStyles?.footer?.align === 'left' ? 'active' : ''}`}
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              footer: {
                                ...formData.template_content.textStyles.footer,
                                align: 'left'
                              }
                            }
                          }
                        })}
                        title="Aligner à gauche"
                      >
                        ☰
                      </button>
                      <button
                        type="button"
                        className={`align-btn ${formData.template_content.textStyles?.footer?.align === 'center' ? 'active' : ''}`}
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              footer: {
                                ...formData.template_content.textStyles.footer,
                                align: 'center'
                              }
                            }
                          }
                        })}
                        title="Centrer"
                      >
                        ☷
                      </button>
                      <button
                        type="button"
                        className={`align-btn ${formData.template_content.textStyles?.footer?.align === 'right' ? 'active' : ''}`}
                        onClick={() => setFormData({
                          ...formData,
                          template_content: {
                            ...formData.template_content,
                            textStyles: {
                              ...formData.template_content.textStyles,
                              footer: {
                                ...formData.template_content.textStyles.footer,
                                align: 'right'
                              }
                            }
                          }
                        })}
                        title="Aligner à droite"
                      >
                        ☰
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={formData.template_content.footer}
                    onChange={e => setFormData({...formData, template_content: {...formData.template_content, footer: e.target.value}})}
                    placeholder="Ex: Merci de votre visite !&#10;À bientôt"
                    rows="3"
                  />
                  <small>Texte affiché en bas du ticket.</small>
                </div>

                <div className="customization-options">
                  <h5>📋 Options d'affichage</h5>
                  <label className="option-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.template_content.showLogo !== false}
                      onChange={e => setFormData({...formData, template_content: {...formData.template_content, showLogo: e.target.checked}})}
                    />
                    <span>Afficher le logo</span>
                  </label>

                  <label className="option-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.template_content.showDate}
                      onChange={e => setFormData({...formData, template_content: {...formData.template_content, showDate: e.target.checked}})}
                    />
                    <span>Afficher la date et l'heure</span>
                  </label>

                  <label className="option-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.template_content.showTable}
                      onChange={e => setFormData({...formData, template_content: {...formData.template_content, showTable: e.target.checked}})}
                    />
                    <span>Afficher le numéro de table</span>
                  </label>

                  <label className="option-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.template_content.showOrderNumber}
                      onChange={e => setFormData({...formData, template_content: {...formData.template_content, showOrderNumber: e.target.checked}})}
                    />
                    <span>Afficher le numéro de commande</span>
                  </label>

                  <label className="option-checkbox highlight">
                    <input
                      type="checkbox"
                      checked={formData.template_content.showPrices !== false}
                      onChange={e => setFormData({...formData, template_content: {...formData.template_content, showPrices: e.target.checked}})}
                    />
                    <span><strong>Afficher les prix</strong> (décocher pour bons de fabrication)</span>
                  </label>

                  <label className="option-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.template_content.showClientName === true}
                      onChange={e => setFormData({...formData, template_content: {...formData.template_content, showClientName: e.target.checked}})}
                    />
                    <span>Afficher le nom du client</span>
                  </label>
                </div>

                <div className="variables-help">
                  <strong>📝 Variables disponibles :</strong>
                  <div className="variables-list">
                    <code>{'{{order_number}}'}</code> - Numéro de commande
                    <code>{'{{table}}'}</code> - Numéro de table
                    <code>{'{{client_name}}'}</code> - Nom du client
                    <code>{'{{date}}'}</code> - Date et heure
                    <code>{'{{total}}'}</code> - Montant total
                    <code>{'{{pos}}'}</code> - Point de vente
                  </div>
                  <small>Vous pouvez utiliser ces variables dans l'en-tête et le pied de page.</small>
                </div>
              </div>

              <div className="ticket-preview">
                <h4>📄 Prévisualisation</h4>
                <div className={`preview-ticket ${
                  formData.template_content.paperSize === '58mm' ? 'narrow' :
                  formData.template_content.paperSize === '80mm' ? 'standard' :
                  formData.template_content.paperSize === 'A6' ? 'a6' :
                  formData.template_content.paperSize === 'A5' ? 'a5' :
                  formData.template_content.paperSize === 'A4' ? 'a4' : 'standard'
                }`}>
                  {formData.template_content.showLogo && formData.template_content.logoUrl && (
                    <div className="preview-logo" style={{textAlign: formData.template_content.logoAlign || 'center', margin: '10px 0'}}>
                      <img src={formData.template_content.logoUrl} alt="Logo" style={{maxWidth: '80px', maxHeight: '80px'}} />
                    </div>
                  )}
                  {formData.template_content.header && (
                    <div className="preview-header" style={{
                      fontWeight: formData.template_content.textStyles?.header?.bold ? 'bold' : 'normal',
                      fontSize: `${formData.template_content.textStyles?.header?.size || 12}px`,
                      textAlign: formData.template_content.textStyles?.header?.align || 'center'
                    }}>
                      {formData.template_content.header.split('\n').map((line, i) => (
                        <div key={i}>{line || ' '}</div>
                      ))}
                    </div>
                  )}
                  <div className="preview-separator">================================</div>
                  {formData.template_content.showDate && (
                    <div className="preview-line">Date: 15/11/2025 19:30:45</div>
                  )}
                  {formData.template_content.showOrderNumber && (
                    <div className="preview-line">N° Commande: ORD-123456</div>
                  )}
                  {formData.template_content.showTable && (
                    <div className="preview-line">Table: T12</div>
                  )}
                  {formData.template_content.showClientName && (
                    <div className="preview-line">Client: Jean Dupont</div>
                  )}
                  <div className="preview-separator">================================</div>
                  {formData.template_content.showPrices !== false ? (
                    <>
                      <div className="preview-line" style={{
                        fontWeight: formData.template_content.textStyles?.body?.bold ? 'bold' : 'normal',
                        fontSize: `${formData.template_content.textStyles?.body?.size || 10}px`,
                        textAlign: formData.template_content.textStyles?.body?.align || 'left'
                      }}>2x Hamburger............15.00€</div>
                      <div className="preview-line" style={{
                        fontWeight: formData.template_content.textStyles?.body?.bold ? 'bold' : 'normal',
                        fontSize: `${formData.template_content.textStyles?.body?.size || 10}px`,
                        textAlign: formData.template_content.textStyles?.body?.align || 'left'
                      }}>1x Coca-Cola............. 2.50€</div>
                      <div className="preview-line" style={{
                        fontWeight: formData.template_content.textStyles?.body?.bold ? 'bold' : 'normal',
                        fontSize: `${formData.template_content.textStyles?.body?.size || 10}px`,
                        textAlign: formData.template_content.textStyles?.body?.align || 'left'
                      }}>1x Café.................. 1.50€</div>
                    </>
                  ) : (
                    <>
                      <div className="preview-line" style={{
                        fontWeight: formData.template_content.textStyles?.body?.bold ? 'bold' : 'normal',
                        fontSize: `${formData.template_content.textStyles?.body?.size || 10}px`,
                        textAlign: formData.template_content.textStyles?.body?.align || 'left'
                      }}>2x Hamburger</div>
                      <div className="preview-line" style={{
                        fontWeight: formData.template_content.textStyles?.body?.bold ? 'bold' : 'normal',
                        fontSize: `${formData.template_content.textStyles?.body?.size || 10}px`,
                        textAlign: formData.template_content.textStyles?.body?.align || 'left'
                      }}>1x Coca-Cola</div>
                      <div className="preview-line" style={{
                        fontWeight: formData.template_content.textStyles?.body?.bold ? 'bold' : 'normal',
                        fontSize: `${formData.template_content.textStyles?.body?.size || 10}px`,
                        textAlign: formData.template_content.textStyles?.body?.align || 'left'
                      }}>1x Café</div>
                    </>
                  )}
                  <div className="preview-separator">================================</div>
                  {formData.template_content.showPrices !== false && (
                    <div className="preview-total">TOTAL: 19.00€</div>
                  )}
                  {formData.template_content.footer && (
                    <>
                      <div className="preview-separator">================================</div>
                      <div className="preview-footer" style={{
                        fontWeight: formData.template_content.textStyles?.footer?.bold ? 'bold' : 'normal',
                        fontSize: `${formData.template_content.textStyles?.footer?.size || 9}px`,
                        textAlign: formData.template_content.textStyles?.footer?.align || 'center'
                      }}>
                        {formData.template_content.footer.split('\n').map((line, i) => (
                          <div key={i}>{line || ' '}</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="form-group-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Modèle actif
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingTemplate ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintTemplates;
