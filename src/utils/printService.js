import { supabase } from '../lib/supabase.js';

export class PrintService {
  static async printOrder(orderId, salesPointId, templateType = 'fabrication') {
    try {
      const printServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';
      const printEndpoint = `${printServiceUrl}/api/print`;

      const response = await fetch(printEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          sales_point_id: salesPointId,
          template_type: templateType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Print failed');
      }

      const result = await response.json();

      return {
        success: true,
        message: result.message || 'Impression réussie',
      };
    } catch (error) {
      console.error(`Error printing ${templateType}:`, error);
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }

  static async generateTicketHtml(orderId, templateType) {

    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        sales_points(name)
      `)
      .eq('id', orderId)
      .single();

    if (!order) return '<div>Commande introuvable</div>';

    const items = order.order_items || [];
    const date = new Date(order.created_at).toLocaleString('fr-FR');

    let html = `
      <div class="header">
        ${templateType === 'fabrication' ? 'FABRICATION' : 'TICKET DE CAISSE'}
      </div>
      <div class="line">Point de vente: ${order.sales_points?.name || 'N/A'}</div>
      <div class="line">N° commande: ${order.order_number}</div>
      <div class="line">Date: ${date}</div>
      <div class="separator"></div>
    `;

    items.forEach(item => {
      html += `<div class="line">${item.quantity}x ${item.product_name} - ${item.unit_price.toFixed(2)}€</div>`;
    });

    html += `
      <div class="separator"></div>
      <div class="total">TOTAL: ${order.total_amount.toFixed(2)}€</div>
    `;

    return html;
  }

  static async printMultipleTickets(orderId, salesPointId, templateTypes = ['fabrication', 'caisse']) {
    const results = [];

    for (const templateType of templateTypes) {
      try {
        const result = await this.printOrder(orderId, salesPointId, templateType);
        results.push({
          templateType,
          ...result,
        });

        // Délai de 500ms entre chaque impression pour éviter les conflits
        if (templateTypes.indexOf(templateType) < templateTypes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        results.push({
          templateType,
          success: false,
          message: error.message,
        });
      }
    }

    return results;
  }

  static async printSpecificItems(orderId, salesPointId, itemIds, templateType = 'fabrication') {
    try {
      const printServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';
      const printEndpoint = `${printServiceUrl}/api/print-specific-items`;

      const response = await fetch(printEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          sales_point_id: salesPointId,
          item_ids: itemIds,
          template_type: templateType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Print failed');
      }

      const result = await response.json();

      return {
        success: true,
        message: result.message || 'Impression réussie',
      };
    } catch (error) {
      console.error(`Error printing specific items:`, error);
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }

  static async printCancellation(orderId, salesPointId, cancelledItems, orderNumber) {
    try {
      const printServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';
      const printEndpoint = `${printServiceUrl}/api/print-cancellation`;

      const response = await fetch(printEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          sales_point_id: salesPointId,
          cancelled_items: cancelledItems,
          order_number: orderNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Print cancellation failed');
      }

      const result = await response.json();

      return {
        success: true,
        message: result.message || 'Bon d\'annulation imprimé',
      };
    } catch (error) {
      console.error('Error printing cancellation:', error);
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }

  static async checkService() {
    try {
      const printServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';
      const response = await fetch(`${printServiceUrl}/api/health`);
      if (!response.ok) throw new Error('Service unavailable');
      return await response.json();
    } catch (error) {
      console.error('Print service check failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  static async getPrinters() {
    try {
      const printServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';
      const response = await fetch(`${printServiceUrl}/api/printers`);
      if (!response.ok) throw new Error('Failed to fetch printers');
      return await response.json();
    } catch (error) {
      console.error('Error fetching printers:', error);
      return { success: false, printers: [] };
    }
  }

  static async getMapping() {
    try {
      const printServiceUrl = import.meta.env.VITE_PRINT_SERVICE_URL || 'http://localhost:3001';
      const response = await fetch(`${printServiceUrl}/api/mapping`);
      if (!response.ok) throw new Error('Failed to fetch mapping');
      return await response.json();
    } catch (error) {
      console.error('Error fetching mapping:', error);
      return { success: false, mapping: {} };
    }
  }
}
