import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';
import Products from './Products';
import StorageLocations from './StorageLocations';
import Categories from './Categories';
import ProductTypes from './ProductTypes';
import SalesPoints from './SalesPoints';
import Inventory from './Inventory';
import POS from './POS';
import Clients from './Clients';
import TableManagement from './TableManagement';
import Users from './Users';
import ActionLogs from './ActionLogs';
import Roles from './Roles';
import VoidLogs from './VoidLogs';
import Suppliers from './Suppliers';
import PurchaseOrders from './PurchaseOrders';
import PurchaseReceptions from './PurchaseReceptions';
import PurchaseHistory from './PurchaseHistory';
import PrinterDefinitions from './PrinterDefinitions';
import PrintTemplates from './PrintTemplates';
import OptionGroups from './OptionGroups';
import './Dashboard.css';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { hasAnyPermission, hasPermission, hasActionablePermissions, loading: permissionsLoading } = usePermissions();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    todaySales: 0,
    salesPointsCount: 0,
    totalRooms: 43,
    occupiedRooms: 0,
    availableRooms: 43,
    lowStockProducts: 0,
    totalProducts: 0,
    pendingOrders: 0,
    totalClients: 0,
    weekSales: [],
    topProducts: [],
    recentActivities: []
  });

  useEffect(() => {
    if (activeModule === 'dashboard') {
      loadDashboardStats();
    }
  }, [activeModule]);

  const loadDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('payment_status', 'paid')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      const todaySales = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

      const { count: salesPointsCount } = await supabase
        .from('sales_points')
        .select('*', { count: 'exact', head: true });

      await supabase.rpc('cleanup_expired_hotel_statuses');

      const { data: occupiedRoomsData } = await supabase
        .from('hotel_rooms')
        .select('id')
        .eq('status', 'occupied');

      const occupiedRooms = occupiedRoomsData?.length || 0;

      const { data: products } = await supabase
        .from('products')
        .select('id, name');

      const { data: stocks } = await supabase
        .from('product_stocks')
        .select('product_id, quantity')
        .lt('quantity', 10);

      const lowStockProducts = stocks?.length || 0;

      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      const { data: pendingOrdersData } = await supabase
        .from('orders')
        .select('id')
        .eq('payment_status', 'pending');

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: weekOrders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('payment_status', 'paid')
        .gte('created_at', sevenDaysAgo.toISOString());

      const weekSales = Array(7).fill(0);
      weekOrders?.forEach(order => {
        const orderDate = new Date(order.created_at);
        const dayDiff = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24));
        if (dayDiff < 7) {
          weekSales[6 - dayDiff] += parseFloat(order.total_amount || 0);
        }
      });

      const { data: topProductsData } = await supabase
        .from('order_items')
        .select('product_id, quantity, products(name)')
        .limit(100);

      const productSales = {};
      topProductsData?.forEach(item => {
        const productName = item.products?.name || 'Produit inconnu';
        productSales[productName] = (productSales[productName] || 0) + item.quantity;
      });

      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, quantity]) => ({ name, quantity }));

      const { data: recentActivitiesData } = await supabase
        .from('action_logs')
        .select('action, user_full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        todaySales,
        salesPointsCount: salesPointsCount || 0,
        totalRooms: 43,
        occupiedRooms,
        availableRooms: 43 - occupiedRooms,
        lowStockProducts,
        totalProducts: products?.length || 0,
        pendingOrders: pendingOrdersData?.length || 0,
        totalClients: totalClients || 0,
        weekSales,
        topProducts,
        recentActivities: recentActivitiesData || []
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  const allModules = [
    { id: 'dashboard', name: 'Tableau de bord', icon: '📊', requiredPermission: null },
    { id: 'cashregister', name: 'Caisse', icon: '💰', requiredPermission: { module: 'pos', action: 'view' } },
    { id: 'pos', name: 'Points de vente', icon: '💳', requiredPermission: { module: 'settings', action: 'manage_sales_points' } },
    { id: 'hotel', name: 'Hôtel', icon: '🏨', requiredPermission: { module: 'pos', action: 'view' } },
    { id: 'tables', name: 'Tables', icon: '🪑', requiredPermission: { module: 'tables', action: 'view' }, requiresActions: true },
    { id: 'products', name: 'Produits', icon: '📦', requiredPermission: { module: 'products', action: 'view' }, requiresActions: true },
    { id: 'categories', name: 'Catégories', icon: '🏷️', requiredPermission: { module: 'products', action: 'view' }, requiresActions: true },
    { id: 'product-types', name: 'Types de produits', icon: '🔖', requiredPermission: { module: 'products', action: 'view' }, requiresActions: true },
    { id: 'option-groups', name: 'Options Produits', icon: '⚙️', requiredPermission: { module: 'products', action: 'view' }, requiresActions: true },
    { id: 'storage', name: 'Dépôts', icon: '🏪', requiredPermission: { module: 'settings', action: 'view' }, requiresActions: true },
    { id: 'inventory', name: 'Stock', icon: '📋', requiredPermission: { module: 'inventory', action: 'view' } },
    { id: 'suppliers', name: 'Fournisseurs', icon: '🚚', requiredPermission: { module: 'inventory', action: 'view' } },
    { id: 'purchase-orders', name: 'Commandes Fournisseurs', icon: '📋', requiredPermission: { module: 'inventory', action: 'view' } },
    { id: 'purchase-receptions', name: 'Réceptions', icon: '📥', requiredPermission: { module: 'inventory', action: 'view' } },
    { id: 'purchase-history', name: 'Historique Achats', icon: '📊', requiredPermission: { module: 'inventory', action: 'view' } },
    { id: 'clients', name: 'Clients', icon: '👤', requiredPermission: { module: 'clients', action: 'view' } },
    { id: 'printer-definitions', name: 'Imprimantes Logiques', icon: '🖨️', requiredPermission: { module: 'settings', action: 'view' } },
    { id: 'print-templates', name: 'Fonctions Impression', icon: '📄', requiredPermission: { module: 'settings', action: 'view' } },
    { id: 'void-logs', name: 'Annulations', icon: '🚫', requiredPermission: { module: 'pos', action: 'view' } },
    { id: 'employees', name: 'Personnel', icon: '👥', requiredPermission: { module: 'users', action: 'view' }, requiresActions: true },
    { id: 'roles', name: 'Rôles', icon: '🔐', requiredPermission: { module: 'users', action: 'manage_permissions' } },
    { id: 'action-logs', name: 'Historique', icon: '📜', requiredPermission: { module: 'users', action: 'view' } },
    { id: 'reports', name: 'Rapports', icon: '📈', requiredPermission: { module: 'reports' } },
  ];

  const modules = useMemo(() => {
    if (permissionsLoading) return [allModules[0]];

    return allModules.filter(module => {
      if (!module.requiredPermission) return true;

      const hasRequiredPermission = module.requiredPermission.action
        ? hasPermission(module.requiredPermission.module, module.requiredPermission.action)
        : hasActionablePermissions(module.requiredPermission.module);

      if (!hasRequiredPermission) return false;

      if (module.requiresActions) {
        return hasActionablePermissions(module.requiredPermission.module);
      }

      return true;
    });
  }, [permissionsLoading, hasPermission, hasActionablePermissions]);

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>ERP Casino</h1>
        </div>
        <nav className="sidebar-nav">
          {modules.map((module) => (
            <button
              key={module.id}
              className={`nav-item ${activeModule === module.id ? 'active' : ''}`}
              onClick={() => {
                if (module.id === 'cashregister') {
                  navigate('/pos');
                } else if (module.id === 'hotel') {
                  navigate('/hotel');
                } else {
                  setActiveModule(module.id);
                  setSidebarOpen(false);
                }
              }}
            >
              <span className="nav-icon">{module.icon}</span>
              <span className="nav-text">{module.name}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">{user?.full_name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={handleSignOut}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h2>{modules.find(m => m.id === activeModule)?.name}</h2>
        </header>
        <div className="content-body">
          {activeModule === 'dashboard' && (
            <div className="dashboard-content">
              <div className="welcome-section">
                <h3>Bienvenue, {user?.full_name}</h3>
                <p>Tableau de bord - Complexe Hôtel-Casino-Restauration</p>
              </div>

              <div className="stats-grid-main">
                <div className="stat-card-main primary">
                  <div className="stat-icon">💰</div>
                  <div className="stat-details">
                    <div className="stat-value">{stats.todaySales.toLocaleString()} FCFA</div>
                    <div className="stat-label">Chiffre d'affaires du jour</div>
                  </div>
                </div>
                <div className="stat-card-main success">
                  <div className="stat-icon">🏨</div>
                  <div className="stat-details">
                    <div className="stat-value">{((stats.occupiedRooms / stats.totalRooms) * 100).toFixed(1)}%</div>
                    <div className="stat-label">Taux d'occupation - {stats.occupiedRooms} / {stats.totalRooms} chambres</div>
                    <div className="stat-progress">
                      <div className="progress-bar" style={{ width: `${(stats.occupiedRooms / stats.totalRooms) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="stat-card-main warning">
                  <div className="stat-icon">📦</div>
                  <div className="stat-details">
                    <div className="stat-value">{stats.lowStockProducts}</div>
                    <div className="stat-label">Produits en stock faible</div>
                  </div>
                </div>
                <div className="stat-card-main info">
                  <div className="stat-icon">👥</div>
                  <div className="stat-details">
                    <div className="stat-value">{stats.totalClients}</div>
                    <div className="stat-label">Clients enregistrés</div>
                  </div>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <div className="card-header">
                    <h4>Ventes des 7 derniers jours</h4>
                  </div>
                  <div className="card-body">
                    <div className="chart-container">
                      <div className="bar-chart">
                        {stats.weekSales.map((sale, index) => {
                          const maxSale = Math.max(...stats.weekSales, 1);
                          const height = (sale / maxSale) * 100;
                          const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                          const today = new Date().getDay();
                          const dayIndex = (today - 6 + index + 7) % 7;
                          return (
                            <div key={index} className="bar-item">
                              <div className="bar-wrapper">
                                <div className="bar" style={{ height: `${height}%` }}>
                                  <span className="bar-value">{sale.toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="bar-label">{days[dayIndex]}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-card">
                  <div className="card-header">
                    <h4>Top 5 Produits</h4>
                  </div>
                  <div className="card-body">
                    <div className="top-products-list">
                      {stats.topProducts.length > 0 ? (
                        stats.topProducts.map((product, index) => (
                          <div key={index} className="product-item">
                            <div className="product-rank">{index + 1}</div>
                            <div className="product-info">
                              <div className="product-name">{product.name}</div>
                              <div className="product-quantity">{product.quantity} vendus</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">Aucune vente enregistrée</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dashboard-card">
                  <div className="card-header">
                    <h4>Activité récente</h4>
                  </div>
                  <div className="card-body">
                    <div className="activity-list">
                      {stats.recentActivities.length > 0 ? (
                        stats.recentActivities.map((activity, index) => {
                          const timeAgo = new Date(activity.created_at);
                          const hoursAgo = Math.floor((new Date() - timeAgo) / (1000 * 60 * 60));
                          const minutesAgo = Math.floor((new Date() - timeAgo) / (1000 * 60));
                          const displayTime = hoursAgo > 0 ? `Il y a ${hoursAgo}h` : `Il y a ${minutesAgo}m`;
                          return (
                            <div key={index} className="activity-item">
                              <div className="activity-icon">📌</div>
                              <div className="activity-details">
                                <div className="activity-text">{activity.action}</div>
                                <div className="activity-meta">
                                  <span>{activity.user_full_name}</span>
                                  <span>{displayTime}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="empty-state">Aucune activité récente</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dashboard-card">
                  <div className="card-header">
                    <h4>Aperçu rapide</h4>
                  </div>
                  <div className="card-body">
                    <div className="quick-stats">
                      <div className="quick-stat-item">
                        <div className="quick-stat-icon">💳</div>
                        <div className="quick-stat-info">
                          <div className="quick-stat-value">{stats.salesPointsCount}</div>
                          <div className="quick-stat-label">Points de vente</div>
                        </div>
                      </div>
                      <div className="quick-stat-item">
                        <div className="quick-stat-icon">📦</div>
                        <div className="quick-stat-info">
                          <div className="quick-stat-value">{stats.totalProducts}</div>
                          <div className="quick-stat-label">Produits</div>
                        </div>
                      </div>
                      <div className="quick-stat-item">
                        <div className="quick-stat-icon">🔔</div>
                        <div className="quick-stat-info">
                          <div className="quick-stat-value">{stats.pendingOrders}</div>
                          <div className="quick-stat-label">Commandes en attente</div>
                        </div>
                      </div>
                      <div className="quick-stat-item">
                        <div className="quick-stat-icon">🛏️</div>
                        <div className="quick-stat-info">
                          <div className="quick-stat-value">{stats.availableRooms}</div>
                          <div className="quick-stat-label">Chambres disponibles</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'products' && <Products />}
          {activeModule === 'categories' && <Categories />}
          {activeModule === 'product-types' && <ProductTypes />}
          {activeModule === 'option-groups' && <OptionGroups />}
          {activeModule === 'storage' && <StorageLocations />}
          {activeModule === 'pos' && <SalesPoints />}
          {activeModule === 'inventory' && <Inventory />}
          {activeModule === 'suppliers' && <Suppliers />}
          {activeModule === 'purchase-orders' && <PurchaseOrders />}
          {activeModule === 'purchase-receptions' && <PurchaseReceptions />}
          {activeModule === 'purchase-history' && <PurchaseHistory />}
          {activeModule === 'cashregister' && <POS />}
          {activeModule === 'printer-definitions' && <PrinterDefinitions />}
          {activeModule === 'print-templates' && <PrintTemplates />}
          {activeModule === 'clients' && <Clients />}
          {activeModule === 'void-logs' && <VoidLogs />}
          {activeModule === 'tables' && <TableManagement standalone={true} />}
          {activeModule === 'employees' && <Users />}
          {activeModule === 'roles' && <Roles />}
          {activeModule === 'action-logs' && <ActionLogs />}

          {!['dashboard', 'products', 'categories', 'product-types', 'option-groups', 'storage', 'pos', 'inventory', 'suppliers', 'purchase-orders', 'purchase-receptions', 'purchase-history', 'cashregister', 'clients', 'void-logs', 'tables', 'employees', 'roles', 'action-logs', 'printer-definitions', 'print-templates'].includes(activeModule) && (
            <div className="welcome-card">
              <h3>Module en cours de développement</h3>
              <p>Ce module sera disponible prochainement.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
