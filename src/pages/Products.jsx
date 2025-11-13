import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import './Products.css';

export default function Products() {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);
  const [salesPoints, setSalesPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productPrices, setProductPrices] = useState([]);
  const [productStocks, setProductStocks] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reference: '',
    category_id: '',
    product_type_id: '',
    unit: 'piece',
    base_price: 0,
    cost_price: 0,
    vat_rate: 10,
    barcode: '',
    is_composed: false,
    printer_id: '',
    min_stock_alert: 0,
    storage_location_id: '',
    price_includes_vat: true,
  });
  const [displayPrices, setDisplayPrices] = useState({
    base_price_ht: 0,
    base_price_ttc: 0,
    cost_price_ht: 0,
    cost_price_ttc: 0,
  });
  const [recipe, setRecipe] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState(1);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchProductType, setSearchProductType] = useState('');
  const [searchStorage, setSearchStorage] = useState('');
  const [showIngredientList, setShowIngredientList] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [calculatedCostPrice, setCalculatedCostPrice] = useState(0);
  const [showFixModal, setShowFixModal] = useState(false);
  const [missingDepotsData, setMissingDepotsData] = useState([]);
  const [showRetroactivityModal, setShowRetroactivityModal] = useState(false);
  const [retroactivityData, setRetroactivityData] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [recipeHistory, setRecipeHistory] = useState([]);
  const [skipDepotsCheck, setSkipDepotsCheck] = useState(false);
  const [coefficient, setCoefficient] = useState(0);
  const [manualCoefficient, setManualCoefficient] = useState('');
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairSummary, setRepairSummary] = useState(null);
  const [previewPriceHT, setPreviewPriceHT] = useState(0);
  const [previewPriceTTC, setPreviewPriceTTC] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes, productTypesRes, printersRes, storageRes, salesPointsRes, pricesRes] = await Promise.all([
        supabase.from('products').select('*, product_categories(name), product_types(name, can_be_sold), storage_locations(name)').order('name'),
        supabase.from('product_categories').select('*').order('name'),
        supabase.from('product_types').select('*').eq('is_active', true).order('name'),
        supabase.from('printers').select('*').order('name'),
        supabase.from('storage_locations').select('*').eq('is_active', true).order('name'),
        supabase.from('sales_points').select('*').eq('is_active', true).order('name'),
        supabase.from('product_prices').select('*, sales_points(name), storage_locations(name)'),
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (productTypesRes.data) setProductTypes(productTypesRes.data);
      if (printersRes.data) setPrinters(printersRes.data);
      if (storageRes.data) {
        console.log('Storage locations loaded:', storageRes.data);
        setStorageLocations(storageRes.data);
      }
      if (salesPointsRes.data) {
        console.log('Sales points loaded:', salesPointsRes.data);
        setSalesPoints(salesPointsRes.data);
      }
      if (pricesRes.data) setProductPrices(pricesRes.data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelRecipeModification = async () => {
    try {
      const { productId, oldRecipeSnapshot } = retroactivityData;

      await supabase
        .from('product_recipes')
        .delete()
        .eq('product_id', productId);

      if (oldRecipeSnapshot && oldRecipeSnapshot.ingredients) {
        const recipeData = oldRecipeSnapshot.ingredients.map(item => ({
          product_id: productId,
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
        }));

        await supabase
          .from('product_recipes')
          .insert(recipeData);
      }

      await supabase
        .from('product_recipes_by_sales_point')
        .delete()
        .eq('product_id', productId);

      const { data: productPricesData } = await supabase
        .from('product_prices')
        .select('sales_point_id, storage_location_id')
        .eq('product_id', productId);

      if (oldRecipeSnapshot && oldRecipeSnapshot.ingredients && productPricesData) {
        const recipesBySalesPoint = [];
        for (const priceItem of productPricesData) {
          if (priceItem.sales_point_id && priceItem.storage_location_id) {
            for (const recipeItem of oldRecipeSnapshot.ingredients) {
              recipesBySalesPoint.push({
                product_id: productId,
                sales_point_id: priceItem.sales_point_id,
                ingredient_id: recipeItem.ingredient_id,
                storage_location_id: priceItem.storage_location_id,
                quantity: recipeItem.quantity,
              });
            }
          }
        }

        if (recipesBySalesPoint.length > 0) {
          await supabase
            .from('product_recipes_by_sales_point')
            .insert(recipesBySalesPoint);
        }
      }

      await supabase
        .from('product_recipes_history')
        .delete()
        .eq('product_id', productId)
        .order('modified_at', { ascending: false })
        .limit(1);

      alert('⚠️ Modification annulée. La recette a été restaurée à son état précédent.');
      setShowRetroactivityModal(false);
      setShowModal(false);
      resetForm();
      loadData();
      setRetroactivityData(null);
    } catch (error) {
      console.error('Erreur annulation:', error);
      alert('Erreur lors de l\'annulation: ' + error.message);
    }
  };

  const applyRetroactivity = async (scope) => {
    try {
      const { productId, lastModifiedAt, newRecipe, oldRecipeSnapshot } = retroactivityData;

      let fromDate = null;
      if (scope === 'since_last_change') {
        fromDate = lastModifiedAt;
      }

      const query = supabase
        .from('order_items')
        .select('id, quantity, order_id, orders!inner(created_at, sales_point_id, sales_points(default_storage_location_id))')
        .eq('product_id', productId);

      if (fromDate) {
        query.gte('orders.created_at', fromDate);
      }

      const { data: orderItems } = await query;

      if (!orderItems || orderItems.length === 0) {
        alert('Aucune vente trouvée dans cette période. La modification a été enregistrée sans ajustement rétroactif.');
        setShowRetroactivityModal(false);

        if (retroactivityData.productPrices && retroactivityData.formData) {
          await finalizeProductSave(retroactivityData.productId, retroactivityData.newRecipe, retroactivityData.productPrices, retroactivityData.formData);
        } else {
          setShowModal(false);
          resetForm();
          loadData();
        }
        return;
      }

      const oldRecipe = oldRecipeSnapshot?.ingredients || [];

      const oldRecipeMap = {};
      oldRecipe.forEach(item => {
        oldRecipeMap[item.ingredient_id] = parseFloat(item.quantity);
      });

      const newRecipeMap = {};
      newRecipe.forEach(item => {
        newRecipeMap[item.ingredient_id] = parseFloat(item.quantity);
      });

      const allIngredientIds = new Set([
        ...Object.keys(oldRecipeMap),
        ...Object.keys(newRecipeMap)
      ]);

      let adjustments = {};

      for (const orderItem of orderItems) {
        const storageLocationId = orderItem.orders.sales_points?.default_storage_location_id;
        if (!storageLocationId) continue;

        for (const ingredientId of allIngredientIds) {
          const oldQty = oldRecipeMap[ingredientId] || 0;
          const newQty = newRecipeMap[ingredientId] || 0;
          const difference = newQty - oldQty;

          if (difference === 0) continue;

          const key = `${ingredientId}_${storageLocationId}`;
          const qtyAdjustment = difference * parseFloat(orderItem.quantity);

          if (!adjustments[key]) {
            const ingredient = newRecipe.find(r => r.ingredient_id === ingredientId)
              || oldRecipe.find(r => r.ingredient_id === ingredientId);

            adjustments[key] = {
              ingredient_id: ingredientId,
              storage_location_id: storageLocationId,
              quantity: 0,
              ingredient_name: ingredient?.ingredient_name || 'Inconnu'
            };
          }
          adjustments[key].quantity += qtyAdjustment;
        }
      }

      for (const key in adjustments) {
        const adj = adjustments[key];

        if (Math.abs(adj.quantity) < 0.001) continue;

        const { data: currentStock } = await supabase
          .from('product_stocks')
          .select('id, quantity')
          .eq('product_id', adj.ingredient_id)
          .eq('storage_location_id', adj.storage_location_id)
          .maybeSingle();

        if (currentStock) {
          const previousQty = parseFloat(currentStock.quantity);
          const newQty = previousQty - adj.quantity;

          await supabase
            .from('product_stocks')
            .update({ quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', currentStock.id);

          await supabase.from('stock_movements').insert({
            product_id: adj.ingredient_id,
            storage_location_id: adj.storage_location_id,
            movement_type: 'adjustment',
            quantity: -adj.quantity,
            previous_quantity: previousQty,
            new_quantity: newQty,
            notes: `Ajustement rétroactif suite modification recette (${scope === 'all' ? 'depuis le début' : 'depuis dernière modification'}) - Différence: ${adj.quantity > 0 ? '+' : ''}${adj.quantity.toFixed(2)}`
          });
        }
      }

      const adjustmentCount = Object.values(adjustments).filter(a => Math.abs(a.quantity) >= 0.001).length;
      alert(`✅ Ajustement rétroactif effectué avec succès !\n\n${adjustmentCount} ajustement(s) de stock réalisé(s) basé(s) sur la différence entre ancienne et nouvelle recette.`);
      setShowRetroactivityModal(false);

      if (retroactivityData.shouldCloseForm && retroactivityData.productPrices && retroactivityData.formData) {
        await finalizeProductSave(retroactivityData.productId, retroactivityData.newRecipe, retroactivityData.productPrices, retroactivityData.formData);
      } else if (retroactivityData.shouldCloseForm) {
        setShowModal(false);
        resetForm();
        loadData();
      }

      setRetroactivityData(null);
    } catch (error) {
      console.error('Erreur ajustement rétroactif:', error);
      alert('Erreur lors de l\'ajustement rétroactif: ' + error.message);
    }
  };

  const repairRetroactiveAdjustments = async () => {
    try {
      const { data: badAdjustments, error: fetchError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('movement_type', 'adjustment')
        .ilike('notes', '%Ajustement rétroactif%')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (!badAdjustments || badAdjustments.length === 0) {
        alert('Aucun ajustement rétroactif à corriger.');
        return;
      }

      let corrections = {};

      for (const adjustment of badAdjustments) {
        const key = `${adjustment.product_id}_${adjustment.storage_location_id}`;

        if (!corrections[key]) {
          corrections[key] = {
            product_id: adjustment.product_id,
            storage_location_id: adjustment.storage_location_id,
            total_correction: 0,
            movements: []
          };
        }

        corrections[key].total_correction -= adjustment.quantity;
        corrections[key].movements.push(adjustment);
      }

      const summary = [];

      for (const key in corrections) {
        const corr = corrections[key];

        const { data: productInfo } = await supabase
          .from('products')
          .select('name')
          .eq('id', corr.product_id)
          .single();

        const { data: storageInfo } = await supabase
          .from('storage_locations')
          .select('name')
          .eq('id', corr.storage_location_id)
          .single();

        const { data: currentStock } = await supabase
          .from('product_stocks')
          .select('id, quantity')
          .eq('product_id', corr.product_id)
          .eq('storage_location_id', corr.storage_location_id)
          .maybeSingle();

        if (currentStock) {
          const previousQty = parseFloat(currentStock.quantity);
          const newQty = previousQty - corr.total_correction;

          await supabase
            .from('product_stocks')
            .update({ quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', currentStock.id);

          await supabase.from('stock_movements').insert({
            product_id: corr.product_id,
            storage_location_id: corr.storage_location_id,
            movement_type: 'adjustment',
            quantity: -corr.total_correction,
            previous_quantity: previousQty,
            new_quantity: newQty,
            notes: `Réparation: annulation de ${corr.movements.length} ajustement(s) rétroactif(s) incorrect(s)`
          });

          for (const movement of corr.movements) {
            await supabase
              .from('stock_movements')
              .delete()
              .eq('id', movement.id);
          }

          summary.push({
            product: productInfo?.name || 'Inconnu',
            storage: storageInfo?.name || 'Inconnu',
            correction: -corr.total_correction,
            previousStock: previousQty,
            newStock: newQty,
            movementsDeleted: corr.movements.length
          });
        }
      }

      setRepairSummary(summary);
      setShowRepairModal(true);
    } catch (error) {
      console.error('Erreur réparation:', error);
      alert('Erreur lors de la réparation: ' + error.message);
    }
  };

  const autoFixMissingDepots = async () => {
    try {
      const fixedCount = missingDepotsData.length;

      for (const missing of missingDepotsData) {
        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id')
          .eq('product_id', missing.ingredientId)
          .eq('storage_location_id', missing.storageId)
          .maybeSingle();

        if (!existingPrice) {
          await supabase
            .from('product_prices')
            .insert([{
              product_id: missing.ingredientId,
              storage_location_id: missing.storageId,
              sales_point_id: null,
              selling_price: null,
              is_active: true
            }]);

          const { data: existingStock } = await supabase
            .from('product_stocks')
            .select('id')
            .eq('product_id', missing.ingredientId)
            .eq('storage_location_id', missing.storageId)
            .maybeSingle();

          if (!existingStock) {
            await supabase
              .from('product_stocks')
              .insert([{
                product_id: missing.ingredientId,
                storage_location_id: missing.storageId,
                quantity: 0
              }]);
          }
        }
      }

      setShowFixModal(false);
      setMissingDepotsData([]);

      alert(`✅ Configuration mise à jour avec succès !\n\n${fixedCount} dépôt(s) ajouté(s) aux ingrédients.`);

      setSkipDepotsCheck(true);
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 100);
    } catch (error) {
      console.error('Erreur lors de la correction automatique:', error);
      alert('Erreur lors de la mise à jour automatique: ' + error.message);
    }
  };

  const finalizeProductSave = async (productId, recipe, productPrices, formData) => {
    try {
      if (formData.is_composed && recipe.length > 0 && productPrices.length > 0) {
        const recipesBySalesPoint = [];

        for (const priceItem of productPrices) {
          if (priceItem.sales_point_id && priceItem.storage_location_id) {
            for (const recipeItem of recipe) {
              recipesBySalesPoint.push({
                product_id: productId,
                sales_point_id: priceItem.sales_point_id,
                ingredient_id: recipeItem.ingredient_id,
                storage_location_id: priceItem.storage_location_id,
                quantity: recipeItem.quantity,
              });
            }
          }
        }

        if (recipesBySalesPoint.length > 0) {
          const { error: recipeSPError } = await supabase
            .from('product_recipes_by_sales_point')
            .insert(recipesBySalesPoint);

          if (recipeSPError) throw recipeSPError;
        }
      }

      if (productPrices.length > 0) {
        const pricesData = productPrices
          .filter(p => p.sales_point_id || p.storage_location_id)
          .map(item => ({
            product_id: productId,
            sales_point_id: item.sales_point_id || null,
            storage_location_id: item.storage_location_id || null,
            selling_price: item.selling_price ? parseFloat(item.selling_price) : null,
            is_active: true,
          }));

        if (pricesData.length > 0) {
          const { error: priceError } = await supabase
            .from('product_prices')
            .insert(pricesData);

          if (priceError) throw priceError;
        }
      }

      const { data: productTypeData } = await supabase
        .from('product_types')
        .select('name')
        .eq('id', formData.product_type_id)
        .single();

      if (productTypeData?.name === 'Matières Premières') {
        const { data: storageLocations } = await supabase
          .from('storage_locations')
          .select('id, name')
          .in('name', ['Casse / Périmés', 'Economat Général']);

        if (storageLocations && storageLocations.length > 0) {
          const storageIdsInPrices = productPrices.map(p => p.storage_location_id).filter(Boolean);
          const storageToAdd = storageLocations.filter(sl => !storageIdsInPrices.includes(sl.id));

          if (storageToAdd.length > 0) {
            const storageInserts = storageToAdd.map(sl => ({
              product_id: productId,
              sales_point_id: null,
              storage_location_id: sl.id,
              selling_price: null,
              is_active: true,
            }));

            await supabase
              .from('product_prices')
              .insert(storageInserts);
          }
        }
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erreur finalisation:', error);
      alert('Erreur lors de la finalisation: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!skipDepotsCheck && formData.is_composed && recipe.length > 0 && productPrices.length > 0) {
        const missingDepots = [];

        for (const priceItem of productPrices) {
          if (!priceItem.sales_point_id || !priceItem.storage_location_id) continue;

          for (const recipeItem of recipe) {
            const { data: ingredientStocks } = await supabase
              .from('product_prices')
              .select('storage_location_id, products(name)')
              .eq('product_id', recipeItem.ingredient_id)
              .eq('storage_location_id', priceItem.storage_location_id);

            if (!ingredientStocks || ingredientStocks.length === 0) {
              const { data: ingredient } = await supabase
                .from('products')
                .select('name')
                .eq('id', recipeItem.ingredient_id)
                .single();

              const { data: storage } = await supabase
                .from('storage_locations')
                .select('name')
                .eq('id', priceItem.storage_location_id)
                .single();

              const { data: salesPoint } = await supabase
                .from('sales_points')
                .select('name')
                .eq('id', priceItem.sales_point_id)
                .single();

              missingDepots.push({
                ingredientId: recipeItem.ingredient_id,
                ingredient: ingredient?.name || 'Inconnu',
                storageId: priceItem.storage_location_id,
                storage: storage?.name || 'Inconnu',
                salesPoint: salesPoint?.name || 'Inconnu'
              });
            }
          }
        }

        if (missingDepots.length > 0) {
          setMissingDepotsData(missingDepots);
          setShowFixModal(true);
          return;
        }
      }

      if (skipDepotsCheck) {
        setSkipDepotsCheck(false);
      }

      const selectedType = productTypes.find(t => t.id === formData.product_type_id);
      const typeName = selectedType?.name || '';
      const isSalesProduct = typeName === 'Produits Vente';
      const isComposed = formData.is_composed;

      const costPriceToSave = (isSalesProduct && isComposed && calculatedCostPrice > 0)
        ? calculatedCostPrice
        : parseFloat(formData.cost_price);

      const productData = {
        ...formData,
        base_price: parseFloat(formData.base_price),
        cost_price: costPriceToSave,
        vat_rate: parseFloat(formData.vat_rate),
        min_stock_alert: parseFloat(formData.min_stock_alert),
        storage_location_id: formData.storage_location_id || null,
        category_id: formData.category_id || null,
        product_type_id: formData.product_type_id || null,
        printer_id: formData.printer_id || null,
      };

      let productId;

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        productId = editingProduct.id;

        await supabase.from('product_recipes').delete().eq('product_id', productId);
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        productId = data.id;
      }

      if (formData.is_composed && recipe.length > 0) {
        if (editingProduct) {
          const { data: currentRecipe } = await supabase
            .from('product_recipes')
            .select(`
              ingredient_id,
              quantity,
              products:ingredient_id (name, unit)
            `)
            .eq('product_id', productId);

          if (currentRecipe && currentRecipe.length > 0) {
            const { data: existingHistory } = await supabase
              .from('product_recipes_history')
              .select('id')
              .eq('product_id', productId)
              .limit(1);

            if (!existingHistory || existingHistory.length === 0) {
              const oldRecipeSnapshot = {
                ingredients: currentRecipe.map(item => ({
                  ingredient_id: item.ingredient_id,
                  ingredient_name: item.products?.name || 'Inconnu',
                  quantity: item.quantity,
                  unit: item.products?.unit || ''
                })),
                product_name: formData.name,
                modified_at: new Date().toISOString()
              };

              await supabase.from('product_recipes_history').insert({
                product_id: productId,
                recipe_snapshot: oldRecipeSnapshot,
                modified_by: null,
                modification_type: 'create',
                notes: 'Sauvegarde de la recette existante avant modification'
              });
            }
          }
        }

        const recipeData = recipe.map(item => ({
          product_id: productId,
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
        }));

        const { error: recipeError } = await supabase
          .from('product_recipes')
          .insert(recipeData);

        if (recipeError) throw recipeError;

        const recipeSnapshot = {
          ingredients: recipe.map(item => ({
            ingredient_id: item.ingredient_id,
            ingredient_name: item.ingredient_name,
            quantity: item.quantity,
            unit: item.unit
          })),
          product_name: formData.name,
          modified_at: new Date().toISOString()
        };

        await supabase.from('product_recipes_history').insert({
          product_id: productId,
          recipe_snapshot: recipeSnapshot,
          modified_by: null,
          modification_type: editingProduct ? 'update' : 'create',
          notes: editingProduct ? 'Modification de la recette' : 'Création initiale de la recette'
        });

        await supabase
          .from('products')
          .update({
            last_recipe_modified_at: new Date().toISOString(),
            last_recipe_modified_by: null
          })
          .eq('id', productId);
      }

      if (editingProduct) {
        const { data: oldPrices } = await supabase
          .from('product_prices')
          .select('storage_location_id')
          .eq('product_id', productId);

        const oldStorageIds = oldPrices?.map(p => p.storage_location_id).filter(Boolean) || [];
        const newStorageIds = productPrices.map(p => p.storage_location_id).filter(Boolean);
        const removedStorageIds = oldStorageIds.filter(id => !newStorageIds.includes(id));

        if (removedStorageIds.length > 0) {
          const { data: stocksInRemovedStorages } = await supabase
            .from('product_stocks')
            .select('storage_location_id, quantity, storage_locations(name)')
            .eq('product_id', productId)
            .in('storage_location_id', removedStorageIds);

          const nonZeroStocks = stocksInRemovedStorages?.filter(s => parseFloat(s.quantity) !== 0) || [];

          if (nonZeroStocks.length > 0) {
            const storageNames = nonZeroStocks.map(s => s.storage_locations?.name || 'Inconnu').join(', ');
            alert(`Impossible de supprimer les dépôts suivants car ils contiennent encore du stock : ${storageNames}. Veuillez d'abord vider les stocks.`);
            setLoading(false);
            return;
          }
        }

        await supabase.from('product_recipes_by_sales_point').delete().eq('product_id', productId);
        await supabase.from('product_prices').delete().eq('product_id', productId);
      }

      if (formData.is_composed && recipe.length > 0 && productPrices.length > 0) {
        const missingStorage = productPrices.some(p => p.sales_point_id && !p.storage_location_id);
        if (missingStorage) {
          alert('Veuillez sélectionner un dépôt de stockage pour chaque point de vente');
          setLoading(false);
          return;
        }

        if (editingProduct) {
          const { data: history, error: historyError } = await supabase
            .from('product_recipes_history')
            .select('modified_at, recipe_snapshot')
            .eq('product_id', productId)
            .order('modified_at', { ascending: false })
            .limit(2);

          console.log('Historique récupéré:', history, 'Erreur:', historyError);

          if (history && history.length > 1) {
            console.log('Modal de rétroactivité devrait apparaître');
            setRetroactivityData({
              productId: productId,
              productName: formData.name,
              lastModifiedAt: history[1].modified_at,
              newRecipe: recipe,
              oldRecipeSnapshot: history[1].recipe_snapshot,
              shouldCloseForm: true,
              productPrices: productPrices,
              formData: formData
            });
            setShowRetroactivityModal(true);
            setLoading(false);
            return;
          } else {
            console.log('Pas assez d\'entrées dans l\'historique pour afficher la rétroactivité:', history?.length);
          }
        }
      }

      if (formData.is_composed && recipe.length > 0 && productPrices.length > 0) {
        const recipesBySalesPoint = [];

        for (const priceItem of productPrices) {
          if (priceItem.sales_point_id && priceItem.storage_location_id) {
            for (const recipeItem of recipe) {
              recipesBySalesPoint.push({
                product_id: productId,
                sales_point_id: priceItem.sales_point_id,
                ingredient_id: recipeItem.ingredient_id,
                storage_location_id: priceItem.storage_location_id,
                quantity: recipeItem.quantity,
              });
            }
          }
        }

        if (recipesBySalesPoint.length > 0) {
          const { error: recipeSPError } = await supabase
            .from('product_recipes_by_sales_point')
            .insert(recipesBySalesPoint);

          if (recipeSPError) throw recipeSPError;
        }
      }

      if (productPrices.length > 0) {
        const pricesData = productPrices
          .filter(p => p.sales_point_id || p.storage_location_id)
          .map(item => ({
            product_id: productId,
            sales_point_id: item.sales_point_id || null,
            storage_location_id: item.storage_location_id || null,
            selling_price: item.selling_price ? parseFloat(item.selling_price) : null,
            is_active: true,
          }));

        if (pricesData.length > 0) {
          const { error: priceError } = await supabase
            .from('product_prices')
            .insert(pricesData);

          if (priceError) throw priceError;
        }
      }

      const { data: productTypeData } = await supabase
        .from('product_types')
        .select('name')
        .eq('id', formData.product_type_id)
        .single();

      if (productTypeData?.name === 'Matières Premières') {
        const { data: storageLocations } = await supabase
          .from('storage_locations')
          .select('id, name')
          .in('name', ['Casse / Périmés', 'Economat Général']);

        if (storageLocations && storageLocations.length > 0) {
          const storageIdsInPrices = productPrices.map(p => p.storage_location_id).filter(Boolean);
          const storageToAdd = storageLocations.filter(sl => !storageIdsInPrices.includes(sl.id));

          if (storageToAdd.length > 0) {
            const storageInserts = storageToAdd.map(sl => ({
              product_id: productId,
              sales_point_id: null,
              storage_location_id: sl.id,
              selling_price: null,
              is_active: true,
            }));

            const { error: storageError } = await supabase
              .from('product_prices')
              .insert(storageInserts);

            if (storageError) {
              console.error('Erreur ajout dépôts par défaut:', storageError);
            }
          }
        }
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);

      if (error.message && error.message.includes('storage_location_id') && error.message.includes('not-null constraint')) {
        alert('Veuillez sélectionner un dépôt de stockage pour le point de vente');
      } else {
        alert('Erreur lors de la sauvegarde: ' + error.message);
      }
    }
  };

  const handleEdit = async (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      reference: product.reference || '',
      category_id: product.category_id || '',
      product_type_id: product.product_type_id || '',
      unit: product.unit || 'piece',
      base_price: product.base_price,
      cost_price: product.cost_price || 0,
      vat_rate: product.vat_rate || 10,
      barcode: product.barcode || '',
      is_composed: product.is_composed,
      printer_id: product.printer_id || '',
      min_stock_alert: product.min_stock_alert || 0,
      storage_location_id: product.storage_location_id || '',
      price_includes_vat: product.price_includes_vat !== false,
    });

    if (product.is_composed) {
      const { data } = await supabase
        .from('product_recipes')
        .select('*, ingredient:products!product_recipes_ingredient_id_fkey(id, name, unit, cost_price)')
        .eq('product_id', product.id);

      if (data) {
        const recipeData = data.map(r => ({
          ingredient_id: r.ingredient_id,
          ingredient_name: r.ingredient.name,
          unit: r.ingredient.unit,
          quantity: r.quantity,
          cost_price: r.ingredient.cost_price || 0,
        }));
        setRecipe(recipeData);
        calculateRecipeCost(recipeData);
      }
    }

    const { data: pricesData } = await supabase
      .from('product_prices')
      .select('*, sales_points(name), storage_locations(name)')
      .eq('product_id', product.id);

    const { data: stocksData } = await supabase
      .from('product_stocks')
      .select('*, storage_locations(name)')
      .eq('product_id', product.id);

    console.log('Prices data for product:', pricesData);
    console.log('Stocks data for product:', stocksData);
    console.log('Available storage locations:', storageLocations);

    if (pricesData) {
      setProductPrices(pricesData.map(p => ({
        product_id: p.product_id,
        sales_point_id: p.sales_point_id,
        storage_location_id: p.storage_location_id,
        selling_price: p.selling_price,
        sales_points: p.sales_points,
        storage_locations: p.storage_locations,
      })));
    } else {
      setProductPrices([]);
    }

    if (stocksData) {
      setProductStocks(stocksData);
    } else {
      setProductStocks([]);
    }

    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      reference: '',
      category_id: '',
      product_type_id: '',
      unit: 'piece',
      base_price: 0,
      cost_price: 0,
      vat_rate: 10,
      barcode: '',
      is_composed: false,
      printer_id: '',
      min_stock_alert: 0,
      storage_location_id: '',
      price_includes_vat: true,
    });
    setDisplayPrices({
      base_price_ht: 0,
      base_price_ttc: 0,
      cost_price_ht: 0,
      cost_price_ttc: 0,
    });
    setRecipe([]);
    setProductPrices([]);
    setProductStocks([]);
    setEditingProduct(null);
    setSelectedIngredient('');
    setIngredientQuantity(1);
    setIngredientSearch('');
    setCalculatedCostPrice(0);
    setCoefficient(0);
    setManualCoefficient('');
    setPreviewPriceHT(0);
    setPreviewPriceTTC(0);
    setShowPreview(false);
    setSkipDepotsCheck(false);
  };

  const addIngredient = () => {
    if (!selectedIngredient) return;

    const ingredient = products.find(p => p.id === selectedIngredient);
    if (!ingredient) return;

    const exists = recipe.find(r => r.ingredient_id === selectedIngredient);
    if (exists) {
      alert('Cet ingrédient est déjà dans la recette');
      return;
    }

    const newRecipe = [...recipe, {
      ingredient_id: ingredient.id,
      ingredient_name: ingredient.name,
      unit: ingredient.unit,
      quantity: parseFloat(ingredientQuantity),
      cost_price: ingredient.cost_price || 0,
    }];

    setRecipe(newRecipe);
    calculateRecipeCost(newRecipe);

    setSelectedIngredient('');
    setIngredientQuantity(1);
  };

  const calculateRecipeCost = (recipeData) => {
    const totalCost = recipeData.reduce((sum, item) => {
      const ingredient = products.find(p => p.id === item.ingredient_id);
      const ingredientCostHT = ingredient?.cost_price || 0;
      return sum + (ingredientCostHT * item.quantity);
    }, 0);
    setCalculatedCostPrice(totalCost);

    if (formData.base_price > 0 && totalCost > 0) {
      const priceHT = formData.base_price / (1 + formData.vat_rate / 100);
      const coef = priceHT / totalCost;
      setCoefficient(coef);
    }
  };

  const calculatePriceFromCoefficient = () => {
    if (!manualCoefficient || calculatedCostPrice === 0) {
      alert('Veuillez saisir un coefficient valide');
      return;
    }

    const coef = parseFloat(manualCoefficient);
    const priceHT = calculatedCostPrice * coef;
    const priceTTC = priceHT * (1 + formData.vat_rate / 100);

    setPreviewPriceHT(priceHT);
    setPreviewPriceTTC(priceTTC);
    setShowPreview(true);
  };

  const validateCalculatedPrice = () => {
    setFormData({
      ...formData,
      base_price: Math.round(previewPriceTTC),
    });
    setCoefficient(parseFloat(manualCoefficient));
    setShowPreview(false);
  };

  useEffect(() => {
    if (recipe.length > 0 && formData.base_price > 0 && calculatedCostPrice > 0) {
      const priceHT = formData.base_price / (1 + formData.vat_rate / 100);
      const coef = priceHT / calculatedCostPrice;
      setCoefficient(coef);
    }
  }, [formData.base_price, formData.vat_rate, calculatedCostPrice, recipe.length]);

  const removeIngredient = (ingredientId) => {
    const newRecipe = recipe.filter(r => r.ingredient_id !== ingredientId);
    setRecipe(newRecipe);
    calculateRecipeCost(newRecipe);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredProducts = products
    .filter(product => {
      const matchName = product.name.toLowerCase().includes(searchName.toLowerCase());
      const matchProductType = !searchProductType || product.product_type_id === searchProductType;
      const matchStorage = !searchStorage || product.storage_location_id === searchStorage;
      return matchName && matchProductType && matchStorage;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'product_type_id') {
        const aType = productTypes.find(t => t.id === a.product_type_id);
        const bType = productTypes.find(t => t.id === b.product_type_id);
        aValue = aType?.name || '';
        bValue = bType?.name || '';
      } else if (sortField === 'storage_location_id') {
        const aStore = storageLocations.find(s => s.id === a.storage_location_id);
        const bStore = storageLocations.find(s => s.id === b.storage_location_id);
        aValue = aStore?.name || '';
        bValue = bStore?.name || '';
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Gestion des Produits</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            onClick={() => repairRetroactiveAdjustments()}
            style={{ background: '#ef4444' }}
          >
            🔧 Réparer ajustements rétroactifs
          </button>
          {canCreate('products') && (
            <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
              + Nouveau Produit
            </button>
          )}
        </div>
      </div>

      <div className="search-filters">
        <input
          type="text"
          placeholder="Rechercher par nom..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="search-input"
        />
        <select
          value={searchProductType}
          onChange={(e) => setSearchProductType(e.target.value)}
          className="search-select"
        >
          <option value="">Tous les types</option>
          {productTypes.map(type => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
        <select
          value={searchStorage}
          onChange={(e) => setSearchStorage(e.target.value)}
          className="search-select"
        >
          <option value="">Tous les dépôts</option>
          {storageLocations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Nom {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('reference')} style={{ cursor: 'pointer' }}>
                Référence {sortField === 'reference' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('product_type_id')} style={{ cursor: 'pointer' }}>
                Type Produit {sortField === 'product_type_id' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('storage_location_id')} style={{ cursor: 'pointer' }}>
                Dépôt {sortField === 'storage_location_id' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('base_price')} style={{ cursor: 'pointer' }}>
                Prix vente {sortField === 'base_price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('cost_price')} style={{ cursor: 'pointer' }}>
                Coût {sortField === 'cost_price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('min_stock_alert')} style={{ cursor: 'pointer' }}>
                Stock min {sortField === 'min_stock_alert' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td>
                  {product.name}
                  {product.is_composed && <span className="badge-composed">Composé</span>}
                </td>
                <td>{product.reference}</td>
                <td>{product.product_types?.name || '-'}</td>
                <td>{product.storage_locations?.name || '-'}</td>
                <td>{product.base_price} F</td>
                <td>{product.cost_price} F</td>
                <td>{product.min_stock_alert}</td>
                <td>
                  <div className="table-actions">
                    {canUpdate('products') && (
                      <button className="btn-edit" onClick={() => handleEdit(product)}>✏️</button>
                    )}
                    {canDelete('products') && (
                      <button className="btn-delete" onClick={() => handleDelete(product.id)}>🗑️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {editingProduct && formData.is_composed && (
                  <button
                    type="button"
                    onClick={async () => {
                      const { data } = await supabase
                        .from('product_recipes_history')
                        .select('*')
                        .eq('product_id', editingProduct.id)
                        .order('modified_at', { ascending: false });
                      setRecipeHistory(data || []);
                      setShowHistoryModal(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    📜 Historique
                  </button>
                )}
                <button className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    onBlur={(e) => setFormData({...formData, name: capitalizeWords(e.target.value)})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Référence *</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Type de produit *</label>
                  <select
                    value={formData.product_type_id}
                    onChange={(e) => setFormData({...formData, product_type_id: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {productTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Catégorie</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  >
                    <option value="">Sélectionner...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Unité</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="piece">Pièce</option>
                    <option value="liter">Litre</option>
                    <option value="kg">Kilogramme</option>
                    <option value="gram">Gramme</option>
                    <option value="ml">Millilitre</option>
                    <option value="portion">Portion</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Prix de vente TTC (FCFA) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({...formData, base_price: e.target.value})}
                    required
                  />
                  <small style={{color: '#6b7280', marginTop: '4px', display: 'block'}}>
                    Prix HT: {formData.base_price && formData.vat_rate ? (formData.base_price / (1 + formData.vat_rate / 100)).toFixed(0) : 0} FCFA
                  </small>
                </div>

                <div className="form-group">
                  <label>Coût d'achat HT (FCFA)</label>
                  {(() => {
                    const selectedType = productTypes.find(t => t.id === formData.product_type_id);
                    const typeName = selectedType?.name || '';
                    const isSalesProduct = typeName === 'Produits Vente';
                    const isComposed = formData.is_composed;

                    if (isSalesProduct && isComposed && calculatedCostPrice > 0) {
                      return (
                        <>
                          <input
                            type="number"
                            step="0.01"
                            value={calculatedCostPrice.toFixed(2)}
                            disabled
                            style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                          />
                          <small style={{color: '#3b82f6', marginTop: '4px', display: 'block', fontWeight: '500'}}>
                            💡 Coût calculé automatiquement à partir de la recette
                          </small>
                        </>
                      );
                    }

                    return (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.cost_price}
                          onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                        />
                        <small style={{color: '#6b7280', marginTop: '4px', display: 'block'}}>
                          Coût TTC: {formData.cost_price && formData.vat_rate ? (formData.cost_price * (1 + formData.vat_rate / 100)).toFixed(0) : 0} FCFA
                        </small>
                      </>
                    );
                  })()}
                </div>

                <div className="form-group">
                  <label>TVA (%) - Sénégal Hôtellerie/Restauration</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.vat_rate}
                    onChange={(e) => setFormData({...formData, vat_rate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Alerte stock minimum</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({...formData, min_stock_alert: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Imprimante</label>
                  <select
                    value={formData.printer_id}
                    onChange={(e) => setFormData({...formData, printer_id: e.target.value})}
                  >
                    <option value="">Aucune</option>
                    {printers.map(printer => (
                      <option key={printer.id} value={printer.id}>{printer.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Code-barres</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_composed}
                    onChange={(e) => setFormData({...formData, is_composed: e.target.checked})}
                  />
                  Produit composé (avec recette)
                </label>
              </div>

              {(() => {
                const selectedType = productTypes.find(t => t.id === formData.product_type_id);
                const isVendable = selectedType?.can_be_sold;
                const typeName = selectedType?.name || '';
                const isRawMaterial = typeName === 'Matières Premières';
                const isConsumable = typeName === 'Consommables';
                const isSalesProduct = typeName === 'Produits Vente';

                return isVendable ? (
                  <div className="price-section">
                    <h3>Points de vente</h3>
                    <p className="help-text">Sélectionnez les points de vente où ce produit sera disponible. Si aucun prix spécifique n'est défini, le prix de base sera utilisé.</p>

                <div className="prices-grid">
                  {productPrices.map((priceItem, index) => {
                    const salesPoint = salesPoints.find(sp => sp.id === priceItem.sales_point_id);
                    return (
                      <div key={index} className="price-item-detailed">
                        <div className="price-header">
                          <select
                            className="sales-point-select"
                            value={priceItem.sales_point_id}
                            onChange={(e) => {
                              const newPrices = [...productPrices];
                              newPrices[index].sales_point_id = e.target.value;
                              setProductPrices(newPrices);
                            }}
                          >
                            <option value="">Sélectionner un point de vente...</option>
                            {salesPoints.map(sp => (
                              <option key={sp.id} value={sp.id}>{sp.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-remove-price"
                            onClick={() => {
                              setProductPrices(productPrices.filter((_, i) => i !== index));
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="price-inputs">
                          <div className="input-group">
                            <span className="input-label">Prix de vente (F)</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder={`Prix (défaut: ${formData.base_price} F)`}
                              value={priceItem.selling_price || ''}
                              onChange={(e) => {
                                const newPrices = [...productPrices];
                                newPrices[index].selling_price = e.target.value;
                                setProductPrices(newPrices);
                              }}
                            />
                          </div>
                          <div className="input-group">
                            <span className="input-label">Dépôt de stockage</span>
                            <select
                              value={priceItem.storage_location_id || ''}
                              onChange={(e) => {
                                const newPrices = [...productPrices];
                                newPrices[index].storage_location_id = e.target.value;
                                setProductPrices(newPrices);
                              }}
                            >
                              <option value="">Sélectionner un dépôt...</option>
                              {storageLocations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </select>
                          </div>
                          {formData.is_composed && isSalesProduct && calculatedCostPrice > 0 && (
                            <div className="input-group" style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                              <div style={{
                                padding: '10px',
                                background: '#f0f9ff',
                                borderRadius: '6px',
                                border: '1px solid #3b82f6'
                              }}>
                                <span style={{ fontSize: '13px', color: '#6b7280', marginRight: '10px' }}>
                                  Coefficient pour ce point de vente:
                                </span>
                                <span style={{
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  color: (() => {
                                    const price = priceItem.selling_price || formData.base_price;
                                    if (!price) return '#6b7280';
                                    const priceHT = price / (1 + formData.vat_rate / 100);
                                    const coef = priceHT / calculatedCostPrice;
                                    return coef >= 3 ? '#10b981' : coef >= 2 ? '#f59e0b' : '#ef4444';
                                  })()
                                }}>
                                  {(() => {
                                    const price = priceItem.selling_price || formData.base_price;
                                    if (!price) return '-';
                                    const priceHT = price / (1 + formData.vat_rate / 100);
                                    const coef = priceHT / calculatedCostPrice;
                                    return coef.toFixed(2);
                                  })()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="btn-add-price"
                  onClick={() => {
                    setProductPrices([...productPrices, {
                      product_id: editingProduct?.id || null,
                      sales_point_id: '',
                      storage_location_id: '',
                      selling_price: '',
                    }]);
                  }}
                >
                  + Ajouter un point de vente
                </button>
                  </div>
                ) : null;
              })()}

              {(() => {
                const selectedType = productTypes.find(t => t.id === formData.product_type_id);
                const typeName = selectedType?.name || '';
                const isSalesProduct = typeName === 'Produits Vente';

                return formData.is_composed && productPrices.length > 0 && isSalesProduct && (
                  <div className="recipe-by-sales-point-section">
                    <h3>Configuration des recettes par point de vente</h3>
                    <p className="help-text">Pour chaque point de vente, spécifiez le dépôt de stockage d'où seront prélevés les ingrédients.</p>

                  {productPrices.map((priceItem, priceIndex) => {
                    const salesPoint = salesPoints.find(sp => sp.id === priceItem.sales_point_id);
                    if (!salesPoint) return null;

                    return (
                      <div key={priceIndex} className="sales-point-recipe-config">
                        <h4>{salesPoint.name}</h4>
                        <div className="form-group">
                          <label>Dépôt de stockage pour les ingrédients</label>
                          <select
                            value={priceItem.storage_location_id || ''}
                            onChange={(e) => {
                              const newPrices = [...productPrices];
                              newPrices[priceIndex].storage_location_id = e.target.value;
                              setProductPrices(newPrices);
                            }}
                          >
                            <option value="">Sélectionner un dépôt...</option>
                            {storageLocations.map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}

              {(() => {
                const selectedType = productTypes.find(t => t.id === formData.product_type_id);
                const typeName = selectedType?.name || '';
                const isSalesProduct = typeName === 'Produits Vente';
                const rawMaterialType = productTypes.find(t => t.name === 'Matières Premières');

                const filteredIngredients = products
                  .filter(p => p.product_type_id === rawMaterialType?.id && p.id !== editingProduct?.id)
                  .filter(p => {
                    if (!ingredientSearch) return true;
                    const searchLower = ingredientSearch.toLowerCase();
                    const nameLower = p.name.toLowerCase();
                    const words = nameLower.split(/\s+/);
                    return words.some(word => word.includes(searchLower)) || nameLower.includes(searchLower);
                  });

                return formData.is_composed && isSalesProduct && (
                  <div className="recipe-section">
                    <h3>Recette / Ingrédients</h3>

                  <div className="ingredient-search-container">
                    <div className="ingredient-search">
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        placeholder="Rechercher un ingrédient..."
                        value={ingredientSearch}
                        onChange={(e) => setIngredientSearch(e.target.value)}
                        onFocus={() => setShowIngredientList(true)}
                        className="search-input"
                      />
                    </div>

                    {showIngredientList && ingredientSearch && (
                      <div className="ingredient-dropdown">
                        {filteredIngredients.length > 0 ? (
                          filteredIngredients.map(p => (
                            <div
                              key={p.id}
                              className="ingredient-item"
                              onClick={() => {
                                setSelectedIngredient(p.id);
                                setIngredientSearch(p.name);
                                setShowIngredientList(false);
                              }}
                            >
                              {p.name} ({p.unit})
                            </div>
                          ))
                        ) : (
                          <div className="ingredient-item-empty">Aucun ingrédient trouvé</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="add-ingredient">

                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={ingredientQuantity}
                      onChange={(e) => setIngredientQuantity(e.target.value)}
                      placeholder="Quantité"
                      className="ingredient-quantity"
                    />

                    <button
                      type="button"
                      className="btn-add"
                      onClick={() => {
                        addIngredient();
                        setIngredientSearch('');
                        setSelectedIngredient('');
                      }}
                      disabled={!selectedIngredient}
                    >
                      Ajouter
                    </button>
                  </div>

                  {recipe.length > 0 && (
                    <>
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '10px', color: '#1f2937' }}>Recette de fabrication</h4>
                        <table className="recipe-table" style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          background: 'white',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                          <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Ingrédient</th>
                              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Qté utilisée</th>
                              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Unité</th>
                              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Coût unitaire HT</th>
                              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Prix de revient HT</th>
                              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recipe.map((item, index) => {
                              const ingredient = products.find(p => p.id === item.ingredient_id);
                              const unitCostHT = ingredient?.cost_price || 0;
                              const totalCostHT = unitCostHT * item.quantity;
                              return (
                                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                  <td style={{ padding: '12px', color: '#111827' }}>{item.ingredient_name}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#111827', fontWeight: '500' }}>{item.quantity}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>{item.unit}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', color: '#111827' }}>{unitCostHT.toFixed(0)} FCFA</td>
                                  <td style={{ padding: '12px', textAlign: 'right', color: '#111827', fontWeight: '600' }}>{totalCostHT.toFixed(0)} FCFA</td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className="btn-remove"
                                      onClick={() => removeIngredient(item.ingredient_id)}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '13px'
                                      }}
                                    >
                                      Retirer
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr style={{ background: '#f9fafb', borderTop: '2px solid #3b82f6' }}>
                              <td colSpan="4" style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#111827', fontSize: '15px' }}>
                                TOTAL PRIX DE REVIENT HT
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#3b82f6', fontSize: '16px' }}>
                                {calculatedCostPrice.toFixed(0)} FCFA
                              </td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="recipe-cost-summary" style={{
                        marginTop: '20px',
                        padding: '20px',
                        background: '#f3f4f6',
                        borderRadius: '8px',
                        border: '2px solid #3b82f6'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1f2937' }}>
                              Prix de revient (coût total)
                            </label>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                              {calculatedCostPrice.toFixed(0)} FCFA
                            </div>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1f2937' }}>
                              Coefficient multiplicateur
                            </label>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: coefficient >= 3 ? '#10b981' : coefficient >= 2 ? '#f59e0b' : '#ef4444' }}>
                              {coefficient > 0 ? coefficient.toFixed(2) : '-'}
                            </div>
                            <small style={{ color: '#6b7280', fontSize: '12px' }}>
                              Prix vente HT / Prix de revient
                            </small>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '15px' }}>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#1f2937' }}>
                            Calculer le prix de vente à partir d'un coefficient
                          </label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="Ex: 3.5"
                              value={manualCoefficient}
                              onChange={(e) => {
                                setManualCoefficient(e.target.value);
                                setShowPreview(false);
                              }}
                              style={{
                                flex: '1',
                                padding: '10px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '16px'
                              }}
                            />
                            <button
                              type="button"
                              onClick={calculatePriceFromCoefficient}
                              disabled={!manualCoefficient || calculatedCostPrice === 0}
                              style={{
                                padding: '10px 20px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                opacity: (!manualCoefficient || calculatedCostPrice === 0) ? 0.5 : 1
                              }}
                            >
                              Calculer
                            </button>
                          </div>

                          {showPreview && (
                            <div style={{
                              padding: '15px',
                              background: '#ecfdf5',
                              borderRadius: '8px',
                              border: '2px solid #10b981',
                              marginTop: '10px'
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                                    Prix de vente HT
                                  </label>
                                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
                                    {previewPriceHT.toFixed(0)} FCFA
                                  </div>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                                    Prix de vente TTC
                                  </label>
                                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
                                    {previewPriceTTC.toFixed(0)} FCFA
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={validateCalculatedPrice}
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  background: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  fontSize: '15px'
                                }}
                              >
                                Valider ce prix
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                );
              })()}

              {(() => {
                const selectedType = productTypes.find(t => t.id === formData.product_type_id);
                const typeName = selectedType?.name || '';
                const isRawMaterial = typeName === 'Matières Premières';
                const isConsumable = typeName === 'Consommables';

                console.log('Product type check:', {
                  typeName,
                  isRawMaterial,
                  isConsumable,
                  shouldShowStorageSection: isRawMaterial || isConsumable,
                  productPricesLength: productPrices.length
                });

                return (isRawMaterial || isConsumable) && (
                  <div className="storage-locations-section">
                    <h3>Dépôts de stockage</h3>
                    <p className="help-text">Sélectionnez les dépôts de stockage où ce produit sera disponible.</p>

                    {productPrices.length === 0 && (
                      <div style={{
                        padding: '20px',
                        background: '#fef3c7',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        textAlign: 'center',
                        color: '#92400e',
                        fontWeight: '500'
                      }}>
                        ⚠️ Aucun dépôt de stockage configuré. Cliquez sur le bouton ci-dessous pour en ajouter un.
                      </div>
                    )}

                    <div className="prices-grid">
                      {productPrices.map((priceItem, index) => {
                        const storageLocation = storageLocations.find(sl => sl.id === priceItem.storage_location_id);
                        return (
                          <div key={index} className="price-item-detailed">
                            <div className="price-header">
                              <select
                                className="sales-point-select"
                                value={priceItem.storage_location_id}
                                onChange={(e) => {
                                  const newPrices = [...productPrices];
                                  newPrices[index].storage_location_id = e.target.value;
                                  setProductPrices(newPrices);
                                }}
                              >
                                <option value="">Sélectionner un dépôt...</option>
                                {storageLocations.map(loc => (
                                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="btn-remove-price"
                                onClick={() => {
                                  setProductPrices(productPrices.filter((_, i) => i !== index));
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="btn-add-price"
                      onClick={() => {
                        setProductPrices([...productPrices, {
                          product_id: editingProduct?.id || null,
                          sales_point_id: null,
                          storage_location_id: '',
                          selling_price: null,
                        }]);
                      }}
                    >
                      + Ajouter un dépôt de stockage
                    </button>
                  </div>
                );
              })()}

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowModal(false); resetForm(); }}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  {editingProduct ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFixModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>⚠️ Configuration incomplète</h2>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: '20px', fontSize: '15px', color: '#4b5563' }}>
                Les ingrédients suivants ne sont pas configurés pour les dépôts requis :
              </p>

              <div style={{
                background: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                {missingDepotsData.map((item, index) => (
                  <div key={index} style={{
                    marginBottom: index < missingDepotsData.length - 1 ? '12px' : '0',
                    paddingBottom: index < missingDepotsData.length - 1 ? '12px' : '0',
                    borderBottom: index < missingDepotsData.length - 1 ? '1px solid #fbbf24' : 'none'
                  }}>
                    <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                      {item.ingredient}
                    </div>
                    <div style={{ fontSize: '14px', color: '#78350f' }}>
                      → Dépôt manquant : <strong>{item.storage}</strong>
                    </div>
                    <div style={{ fontSize: '13px', color: '#78350f', marginTop: '2px' }}>
                      (requis pour le point de vente : {item.salesPoint})
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                background: '#e0f2fe',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '14px', color: '#0c4a6e', lineHeight: '1.6' }}>
                  <strong>💡 Correction automatique disponible</strong>
                  <p style={{ margin: '8px 0 0 0' }}>
                    Cliquez sur "Corriger automatiquement" pour ajouter les dépôts manquants
                    aux fiches ingrédients. Les stocks seront initialisés à 0.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowFixModal(false)}
                  style={{ padding: '12px 24px' }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={autoFixMissingDepots}
                  style={{ padding: '12px 24px', background: '#0ea5e9' }}
                >
                  ✓ Corriger automatiquement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRetroactivityModal && retroactivityData && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2>📊 Ajustement rétroactif des stocks</h2>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ fontWeight: '600', color: '#856404', marginBottom: '8px' }}>
                  ⚠️ Modification de recette détectée
                </div>
                <div style={{ fontSize: '14px', color: '#856404' }}>
                  Vous avez modifié la recette de <strong>{retroactivityData.productName}</strong>.
                </div>
                <div style={{ fontSize: '13px', color: '#856404', marginTop: '4px' }}>
                  Dernière modification : {new Date(retroactivityData.lastModifiedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.6', marginBottom: '16px' }}>
                  Souhaitez-vous ajuster rétroactivement les stocks pour refléter cette modification ?
                </p>

                <div style={{
                  background: '#e0f2fe',
                  border: '1px solid #0ea5e9',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '14px', color: '#0c4a6e', lineHeight: '1.6' }}>
                    <strong>💡 Deux options disponibles :</strong>
                    <ul style={{ margin: '12px 0 0 0', paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '8px' }}>
                        <strong>Depuis la dernière modification</strong> : Ajuste uniquement les ventes effectuées après la dernière modification de recette
                      </li>
                      <li>
                        <strong>Depuis le début</strong> : Ajuste TOUTES les ventes historiques de ce produit (à utiliser avec précaution)
                      </li>
                    </ul>
                  </div>
                </div>

                <div style={{
                  background: '#fee2e2',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '13px',
                  color: '#991b1b'
                }}>
                  <strong>⚠️ Attention :</strong> Cette action modifiera les quantités en stock et créera des mouvements d'ajustement dans l'historique.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => cancelRecipeModification()}
                  style={{ padding: '12px 24px' }}
                >
                  Annuler modification
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={() => applyRetroactivity('since_last_change')}
                  style={{ padding: '12px 24px', background: '#0ea5e9' }}
                >
                  Depuis dernière modification
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={() => applyRetroactivity('all')}
                  style={{ padding: '12px 24px', background: '#ef4444' }}
                >
                  Depuis le début
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>📜 Historique des modifications de recette</h2>
              <button className="btn-close" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>

            <div style={{ padding: '24px' }}>
              {recipeHistory.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6b7280',
                  fontSize: '15px'
                }}>
                  Aucune modification enregistrée pour ce produit
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '20px', padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: '#0369a1', marginBottom: '8px' }}>
                      📊 Statistiques
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Total modifications : </span>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{recipeHistory.length}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Version actuelle : </span>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{recipeHistory[0]?.recipe_snapshot?.ingredients?.length || 0} ingrédients</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Dernière modification : </span>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>
                          {new Date(recipeHistory[0]?.modified_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {recipeHistory.map((entry, index) => {
                      const previousEntry = index < recipeHistory.length - 1 ? recipeHistory[index + 1] : null;
                      const currentIngredients = entry.recipe_snapshot?.ingredients || [];
                      const previousIngredients = previousEntry?.recipe_snapshot?.ingredients || [];

                      const added = [];
                      const removed = [];
                      const modified = [];

                      if (previousEntry && entry.modification_type === 'update') {
                        const prevMap = {};
                        previousIngredients.forEach(ing => {
                          prevMap[ing.ingredient_id] = ing;
                        });

                        currentIngredients.forEach(ing => {
                          const prev = prevMap[ing.ingredient_id];
                          if (!prev) {
                            added.push(ing);
                          } else if (prev.quantity !== ing.quantity) {
                            modified.push({ current: ing, previous: prev });
                          }
                          delete prevMap[ing.ingredient_id];
                        });

                        Object.values(prevMap).forEach(ing => removed.push(ing));
                      }

                      return (
                    <div
                      key={entry.id}
                      style={{
                        background: index === 0 ? '#f0fdf4' : '#f9fafb',
                        border: `2px solid ${index === 0 ? '#10b981' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        padding: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '15px', color: '#1f2937', marginBottom: '4px' }}>
                            {entry.modification_type === 'create' && '🆕 Création initiale'}
                            {entry.modification_type === 'update' && '✏️ Modification'}
                            {entry.modification_type === 'delete' && '🗑️ Suppression'}
                            {index === 0 && <span style={{
                              marginLeft: '8px',
                              background: '#10b981',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>Actuel</span>}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            {new Date(entry.modified_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>

                      {entry.notes && (
                        <div style={{
                          background: '#fff',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: '#4b5563',
                          marginBottom: '12px',
                          fontStyle: 'italic'
                        }}>
                          {entry.notes}
                        </div>
                      )}

                      {(added.length > 0 || removed.length > 0 || modified.length > 0) && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontWeight: '500', fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                            🔄 Changements :
                          </div>
                          <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', border: '1px solid #e5e7eb' }}>
                            {added.length > 0 && (
                              <div style={{ marginBottom: modified.length > 0 || removed.length > 0 ? '8px' : '0' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#059669', marginBottom: '4px' }}>
                                  + Ajouté ({added.length}) :
                                </div>
                                {added.map((ing, idx) => (
                                  <div key={idx} style={{ fontSize: '13px', color: '#059669', paddingLeft: '12px' }}>
                                    • {ing.ingredient_name} : {ing.quantity} {ing.unit}
                                  </div>
                                ))}
                              </div>
                            )}
                            {modified.length > 0 && (
                              <div style={{ marginBottom: removed.length > 0 ? '8px' : '0' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#2563eb', marginBottom: '4px' }}>
                                  ↔ Modifié ({modified.length}) :
                                </div>
                                {modified.map((change, idx) => (
                                  <div key={idx} style={{ fontSize: '13px', color: '#2563eb', paddingLeft: '12px' }}>
                                    • {change.current.ingredient_name} : <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{change.previous.quantity}</span> → {change.current.quantity} {change.current.unit}
                                  </div>
                                ))}
                              </div>
                            )}
                            {removed.length > 0 && (
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                                  - Retiré ({removed.length}) :
                                </div>
                                {removed.map((ing, idx) => (
                                  <div key={idx} style={{ fontSize: '13px', color: '#dc2626', paddingLeft: '12px' }}>
                                    • {ing.ingredient_name} : {ing.quantity} {ing.unit}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {currentIngredients.length > 0 && (
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                            📋 Composition complète ({currentIngredients.length}) :
                          </div>
                          <div style={{
                            background: '#fff',
                            borderRadius: '6px',
                            padding: '12px',
                            border: '1px solid #e5e7eb'
                          }}>
                            {currentIngredients.map((ing, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '6px 0',
                                  borderBottom: idx < currentIngredients.length - 1 ? '1px solid #f3f4f6' : 'none'
                                }}
                              >
                                <span style={{ fontSize: '14px', color: '#1f2937' }}>
                                  {ing.ingredient_name || 'Inconnu'}
                                </span>
                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#3b82f6' }}>
                                  {ing.quantity} {ing.unit || ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowHistoryModal(false)}
                style={{ padding: '12px 24px' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showRepairModal && repairSummary && (
        <div className="modal-overlay" onClick={() => setShowRepairModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Réparation des ajustements rétroactifs</h2>
              <button className="btn-close" onClick={() => setShowRepairModal(false)}>×</button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                background: '#d1fae5',
                border: '2px solid #10b981',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#065f46', marginBottom: '4px' }}>
                  Réparation terminée avec succès !
                </div>
                <div style={{ fontSize: '14px', color: '#047857' }}>
                  Les stocks ont été corrigés en annulant les ajustements rétroactifs incorrects
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Résumé des corrections :
                </h3>

                {repairSummary.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>
                        {item.product}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {item.storage}
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#4b5563' }}>
                      <div style={{ marginBottom: '4px' }}>
                        Stock avant : <strong>{item.previousStock.toFixed(2)}</strong>
                      </div>
                      <div style={{ marginBottom: '4px' }}>
                        Correction appliquée : <strong style={{ color: item.correction > 0 ? '#10b981' : '#ef4444' }}>
                          {item.correction > 0 ? '+' : ''}{item.correction.toFixed(2)}
                        </strong>
                      </div>
                      <div style={{ marginBottom: '4px' }}>
                        Nouveau stock : <strong style={{ color: '#3b82f6' }}>{item.newStock.toFixed(2)}</strong>
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                        {item.movementsDeleted} mouvement(s) incorrect(s) supprimé(s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: '20px',
                padding: '12px',
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#92400e'
              }}>
                <strong>Note :</strong> Vous pouvez maintenant modifier à nouveau les recettes. Le système utilisera la nouvelle logique différentielle qui évite les doubles déductions.
              </div>
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowRepairModal(false);
                  setRepairSummary(null);
                  loadData();
                }}
                style={{ padding: '12px 24px' }}
              >
                Fermer et actualiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
