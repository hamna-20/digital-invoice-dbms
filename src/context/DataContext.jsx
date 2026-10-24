import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import {
  deleteCustomer as deleteCustomerRequest,
  listCustomers,
  saveCustomer,
} from '../services/customerService';
import {
  deleteProduct as deleteProductRequest,
  listProducts,
  saveProduct,
} from '../services/productService';
import {
  cancelInvoice as cancelInvoiceRequest,
  deleteInvoice as deleteInvoiceRequest,
  issueInvoice as issueInvoiceRequest,
  listInvoices,
  markInvoicePaid as markPaidRequest,
  saveInvoice as saveInvoiceRequest,
} from '../services/invoiceService';
import { get, set } from '../services/storage';
import { dataStorageKey } from '../config/constants';

export const DataContext = createContext(null);

/** Loads the signed-in user's data and exposes every mutation as a promise. */
export default function DataProvider({ children }) {
  const { user } = useAuth();
  const userId = user ? user.id : null;
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setProducts([]);
      setCustomers([]);
      setInvoices([]);
      setUserProfile(null);
      setLoadError('');
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setLoadError('');
    Promise.all([listProducts(userId), listCustomers(userId), listInvoices(userId)])
      .then(([productList, customerList, invoiceList]) => {
        if (!active) return;
        setProducts(productList);
        setCustomers(customerList);
        setInvoices(invoiceList);
        const record = get(dataStorageKey(userId), {});
        setUserProfile(record.userProfile || null);
        setLoadError('');
      })
      .catch((error) => {
        if (!active) return;
        setProducts([]);
        setCustomers([]);
        setInvoices([]);
        setUserProfile(null);
        setLoadError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [productList, customerList, invoiceList] = await Promise.all([
        listProducts(userId),
        listCustomers(userId),
        listInvoices(userId),
      ]);
      setProducts(productList);
      setCustomers(customerList);
      setInvoices(invoiceList);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message);
      throw error;
    }
  }, [userId]);

  /** Runs a service mutation, refreshes the lists and toggles the saving flag. */
  const mutate = useCallback(
    async (task) => {
      if (!userId) return undefined;
      setSaving(true);
      try {
        return await task(userId);
      } finally {
        // Always re-read server state: an issue operation can save the draft
        // and then fail, and the list must still reflect what was persisted.
        await refresh().catch(() => {});
        setSaving(false);
      }
    },
    [userId, refresh]
  );

  const mutateCustomer = useCallback(
    async (task) => {
      if (!userId) throw new Error('Sign in before changing customer records.');
      setSaving(true);
      try {
        const result = await task();
        setLoadError('');
        return result;
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );
  const addCustomer = useCallback(
    (customer) =>
      mutateCustomer(async () => {
        const saved = await saveCustomer(customer);
        setCustomers((current) => [saved, ...current]);
        return saved;
      }),
    [mutateCustomer]
  );
  const updateCustomer = useCallback(
    (customer) =>
      mutateCustomer(async () => {
        const saved = await saveCustomer(customer);
        setCustomers((current) => current.map((item) => (item.id === saved.id ? saved : item)));
        return saved;
      }),
    [mutateCustomer]
  );
  const deleteCustomer = useCallback(
    (customerId) =>
      mutateCustomer(async () => {
        await deleteCustomerRequest(customerId);
        setCustomers((current) => current.filter((item) => item.id !== customerId));
      }),
    [mutateCustomer]
  );
  const addProduct = useCallback((product) => mutate((id) => saveProduct(id, product)), [mutate]);
  const updateProduct = useCallback((product) => mutate((id) => saveProduct(id, product)), [mutate]);
  const deleteProduct = useCallback((productId) => mutate((id) => deleteProductRequest(id, productId)), [mutate]);
  const saveInvoice = useCallback((invoice) => mutate((id) => saveInvoiceRequest(id, invoice)), [mutate]);
  const issueInvoice = useCallback((invoice) => mutate((id) => issueInvoiceRequest(id, invoice)), [mutate]);
  const deleteInvoice = useCallback((invoiceId) => mutate((id) => deleteInvoiceRequest(id, invoiceId)), [mutate]);
  const markInvoicePaid = useCallback((invoiceId) => mutate((id) => markPaidRequest(id, invoiceId)), [mutate]);
  const cancelInvoice = useCallback(
    (invoiceId) => mutate((id) => cancelInvoiceRequest(id, invoiceId)),
    [mutate]
  );
  const updateUserProfile = useCallback(
    (profile) =>
      mutate((id) => {
        const record = get(dataStorageKey(id), {});
        const nextProfile = { ...(record.userProfile || {}), ...profile };
        set(dataStorageKey(id), { ...record, userProfile: nextProfile });
        setUserProfile(nextProfile);
        return nextProfile;
      }),
    [mutate]
  );

  const value = useMemo(
    () => ({
      products,
      customers,
      invoices,
      userProfile,
      loading,
      loadError,
      saving,
      refresh,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addProduct,
      updateProduct,
      deleteProduct,
      saveInvoice,
      issueInvoice,
      deleteInvoice,
      markInvoicePaid,
      cancelInvoice,
      updateUserProfile,
    }),
    [
      products,
      customers,
      invoices,
      userProfile,
      loading,
      loadError,
      saving,
      refresh,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addProduct,
      updateProduct,
      deleteProduct,
      saveInvoice,
      issueInvoice,
      deleteInvoice,
      markInvoicePaid,
      cancelInvoice,
      updateUserProfile,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
