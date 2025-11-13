import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role_id) {
      loadPermissions();
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [user?.role_id]);

  async function loadPermissions() {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permissions(module, action)')
        .eq('role_id', user.role_id);

      if (error) throw error;

      const perms = data.map(item => ({
        module: item.permissions.module,
        action: item.permissions.action
      }));

      setPermissions(perms);
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }

  function hasPermission(module, action) {
    if (user?.roles?.name === 'Administrateur') {
      return true;
    }

    return permissions.some(
      p => p.module === module && p.action === action
    );
  }

  function hasAnyPermission(module) {
    if (user?.roles?.name === 'Administrateur') {
      return true;
    }

    return permissions.some(p => p.module === module);
  }

  function canView(module) {
    return hasPermission(module, 'view');
  }

  function canCreate(module) {
    return hasPermission(module, 'create');
  }

  function canUpdate(module) {
    return hasPermission(module, 'update');
  }

  function canDelete(module) {
    return hasPermission(module, 'delete');
  }

  function hasActionablePermissions(module) {
    if (user?.roles?.name === 'Administrateur') {
      return true;
    }

    const modulePerms = permissions.filter(p => p.module === module);

    if (modulePerms.length === 0) return false;

    if (modulePerms.length === 1 && modulePerms[0].action === 'view') {
      return false;
    }

    return true;
  }

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    hasActionablePermissions
  };
}
