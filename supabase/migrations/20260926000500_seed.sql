-- =============================================================================
-- StockSense — bootstrap seed data
-- Runs once (guarded by "if a warehouse already exists, skip"). Creates the
-- master data (warehouses/locations/categories/products/suppliers/customers),
-- a set of operation documents across every status (including a few
-- historical "done" ones with matching stock_ledger rows), and the final
-- inventory_balances that those documents' history adds up to. Everything
-- here is a plain superuser INSERT — RLS/RPC auth (auth.uid()) doesn't apply
-- to a migration session, so timestamps are just set directly rather than
-- routed through the confirm_*/complete_* functions.
-- responsible_id / created_by are left NULL throughout: the demo profiles
-- are created afterwards via supabase/seed/create-users.mjs, and both
-- columns are nullable.
-- =============================================================================

do $$
declare
  -- warehouses
  v_wh_main   uuid;
  v_wh_north  uuid;
  v_wh_prod   uuid;
  -- locations
  v_loc_main_racka    uuid;
  v_loc_main_rackb    uuid;
  v_loc_main_prodstg  uuid;
  v_loc_main_fg       uuid;
  v_loc_north_racka   uuid;
  v_loc_north_rackb   uuid;
  v_loc_prod_rawmat   uuid;
  v_loc_prod_assy     uuid;
  v_loc_prod_dispatch uuid;
  -- categories
  v_cat_raw         uuid;
  v_cat_furniture   uuid;
  v_cat_electronics uuid;
  v_cat_tools       uuid;
  v_cat_supplies    uuid;
  -- products
  v_p_steel_rod     uuid;
  v_p_steel_sheet   uuid;
  v_p_office_chair  uuid;
  v_p_work_table    uuid;
  v_p_wood_panel    uuid;
  v_p_laptop        uuid;
  v_p_monitor       uuid;
  v_p_keyboard      uuid;
  v_p_safety_helmet uuid;
  v_p_drill_machine uuid;
  v_p_screw_pack    uuid;
  v_p_packaging_box uuid;
  -- suppliers
  v_sup_steel       uuid;
  v_sup_timber      uuid;
  v_sup_electronics uuid;
  v_sup_supplies    uuid;
  v_sup_tools       uuid;
  -- customers
  v_cus_horizon  uuid;
  v_cus_coastal  uuid;
  v_cus_technova uuid;
  v_cus_prime    uuid;
  v_cus_summit   uuid;
  -- documents
  v_r1 uuid; v_r2 uuid; v_r3 uuid; v_r4 uuid; v_r5 uuid; v_r6 uuid; v_r7 uuid; v_r8 uuid;
  v_d1 uuid; v_d2 uuid; v_d3 uuid; v_d4 uuid; v_d5 uuid; v_d6 uuid; v_d7 uuid; v_d8 uuid; v_d9 uuid; v_d10 uuid; v_d11 uuid;
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_t4 uuid; v_t5 uuid; v_t6 uuid;
  v_a1 uuid; v_a2 uuid; v_a3 uuid; v_a4 uuid; v_a5 uuid; v_a6 uuid;
begin
  if exists (select 1 from public.warehouses) then
    raise notice 'Seed already applied — skipping.';
    return;
  end if;

  -- ---------------------------------------------------------------------
  -- Warehouses & locations
  -- ---------------------------------------------------------------------
  v_wh_main := gen_random_uuid();
  v_wh_north := gen_random_uuid();
  v_wh_prod := gen_random_uuid();
  insert into public.warehouses (id, name, short_code, address) values
    (v_wh_main, 'Main Warehouse', 'WH01', 'Chennai'),
    (v_wh_north, 'North Warehouse', 'WH02', 'Chennai'),
    (v_wh_prod, 'Production Warehouse', 'WH03', 'Chennai');

  v_loc_main_racka := gen_random_uuid();
  v_loc_main_rackb := gen_random_uuid();
  v_loc_main_prodstg := gen_random_uuid();
  v_loc_main_fg := gen_random_uuid();
  v_loc_north_racka := gen_random_uuid();
  v_loc_north_rackb := gen_random_uuid();
  v_loc_prod_rawmat := gen_random_uuid();
  v_loc_prod_assy := gen_random_uuid();
  v_loc_prod_dispatch := gen_random_uuid();

  insert into public.locations (id, warehouse_id, name, short_code) values
    (v_loc_main_racka, v_wh_main, 'Rack A', 'RACK-A'),
    (v_loc_main_rackb, v_wh_main, 'Rack B', 'RACK-B'),
    (v_loc_main_prodstg, v_wh_main, 'Production Staging', 'PROD-STG'),
    (v_loc_main_fg, v_wh_main, 'Finished Goods', 'FIN-GDS'),
    (v_loc_north_racka, v_wh_north, 'Rack A', 'RACK-A'),
    (v_loc_north_rackb, v_wh_north, 'Rack B', 'RACK-B'),
    (v_loc_prod_rawmat, v_wh_prod, 'Raw Material', 'RAW-MAT'),
    (v_loc_prod_assy, v_wh_prod, 'Assembly', 'ASSY'),
    (v_loc_prod_dispatch, v_wh_prod, 'Dispatch', 'DISP');

  -- ---------------------------------------------------------------------
  -- Categories & products
  -- ---------------------------------------------------------------------
  v_cat_raw := gen_random_uuid();
  v_cat_furniture := gen_random_uuid();
  v_cat_electronics := gen_random_uuid();
  v_cat_tools := gen_random_uuid();
  v_cat_supplies := gen_random_uuid();
  insert into public.product_categories (id, name, description) values
    (v_cat_raw, 'Raw Materials', 'Base materials used in production'),
    (v_cat_furniture, 'Furniture', 'Office and industrial furniture'),
    (v_cat_electronics, 'Electronics', 'Computers and peripherals'),
    (v_cat_tools, 'Tools', 'Hand and power tools'),
    (v_cat_supplies, 'Industrial Supplies', 'Consumables and safety supplies');

  v_p_steel_rod := gen_random_uuid();
  v_p_steel_sheet := gen_random_uuid();
  v_p_office_chair := gen_random_uuid();
  v_p_work_table := gen_random_uuid();
  v_p_wood_panel := gen_random_uuid();
  v_p_laptop := gen_random_uuid();
  v_p_monitor := gen_random_uuid();
  v_p_keyboard := gen_random_uuid();
  v_p_safety_helmet := gen_random_uuid();
  v_p_drill_machine := gen_random_uuid();
  v_p_screw_pack := gen_random_uuid();
  v_p_packaging_box := gen_random_uuid();

  insert into public.products (
    id, name, sku, category_id, unit_of_measure, per_unit_cost, initial_stock, reorder_point, reorder_quantity, description
  ) values
    (v_p_steel_rod, 'Steel Rod', 'STL-ROD-001', v_cat_raw, 'kg', 55.00, 950, 200, 500, '12mm mild steel rod'),
    (v_p_steel_sheet, 'Steel Sheet', 'STL-SHT-001', v_cat_raw, 'sheet', 850.00, 25, 30, 100, '4x8 ft steel sheet, 2mm'),
    (v_p_wood_panel, 'Wood Panel', 'WD-PNL-001', v_cat_raw, 'panel', 620.00, 80, 40, 100, '18mm plywood panel'),
    (v_p_screw_pack, 'Screw Pack', 'SCR-PCK-001', v_cat_supplies, 'pack', 45.00, 350, 100, 300, 'Pack of 100 assorted screws'),
    (v_p_packaging_box, 'Packaging Box', 'PKG-BOX-001', v_cat_supplies, 'box', 18.00, 0, 150, 500, 'Corrugated shipping box, medium'),
    (v_p_safety_helmet, 'Safety Helmet', 'SFT-HLM-001', v_cat_supplies, 'pcs', 320.00, 15, 20, 50, 'ISI-marked safety helmet'),
    (v_p_drill_machine, 'Drill Machine', 'DRL-MCH-001', v_cat_tools, 'pcs', 2450.00, 4, 5, 15, 'Corded electric drill, 13mm chuck'),
    (v_p_office_chair, 'Office Chair', 'FUR-CHR-001', v_cat_furniture, 'pcs', 3200.00, 23, 10, 25, 'Ergonomic mesh-back office chair'),
    (v_p_work_table, 'Work Table', 'FUR-TBL-001', v_cat_furniture, 'pcs', 5400.00, 2, 5, 15, 'Heavy-duty steel-frame work table'),
    (v_p_laptop, 'Laptop', 'ELC-LAP-001', v_cat_electronics, 'pcs', 48000.00, 0, 5, 10, '14-inch business laptop, 16GB RAM'),
    (v_p_monitor, 'Monitor', 'ELC-MON-001', v_cat_electronics, 'pcs', 9800.00, 18, 8, 20, '24-inch full HD monitor'),
    (v_p_keyboard, 'Keyboard', 'ELC-KBD-001', v_cat_electronics, 'pcs', 1200.00, 30, 15, 40, 'Wired mechanical keyboard');

  -- ---------------------------------------------------------------------
  -- Suppliers & customers
  -- ---------------------------------------------------------------------
  v_sup_steel := gen_random_uuid();
  v_sup_timber := gen_random_uuid();
  v_sup_electronics := gen_random_uuid();
  v_sup_supplies := gen_random_uuid();
  v_sup_tools := gen_random_uuid();
  insert into public.suppliers (id, name, contact_person, phone, email, address) values
    (v_sup_steel, 'Chennai Steel Traders', 'Ravi Shankar', '+91-9840011223', 'sales@chennaisteel.example', 'Ambattur Industrial Estate, Chennai'),
    (v_sup_timber, 'TN Timber Co', 'Murugan K', '+91-9884455667', 'contact@tntimber.example', 'Red Hills, Chennai'),
    (v_sup_electronics, 'BrightSpark Electronics Pvt Ltd', 'Divya Menon', '+91-9677788990', 'orders@brightspark.example', 'Guindy Industrial Estate, Chennai'),
    (v_sup_supplies, 'SafeGuard Industrial Supplies', 'Karthik Raja', '+91-9500123456', 'info@safeguard.example', 'Perungudi, Chennai'),
    (v_sup_tools, 'Apex Tools & Machinery', 'Suresh Babu', '+91-9962233445', 'sales@apextools.example', 'Ekkatuthangal, Chennai');

  v_cus_horizon := gen_random_uuid();
  v_cus_coastal := gen_random_uuid();
  v_cus_technova := gen_random_uuid();
  v_cus_prime := gen_random_uuid();
  v_cus_summit := gen_random_uuid();
  insert into public.customers (id, name, contact_person, phone, email, address) values
    (v_cus_horizon, 'Horizon Retail Pvt Ltd', 'Anitha Raman', '+91-9840099887', 'purchase@horizonretail.example', 'T. Nagar, Chennai'),
    (v_cus_coastal, 'Coastal Furniture Mart', 'Vignesh Iyer', '+91-9884433221', 'orders@coastalfurniture.example', 'ECR, Chennai'),
    (v_cus_technova, 'TechNova Solutions', 'Preethi Nair', '+91-9677711223', 'procurement@technova.example', 'OMR, Chennai'),
    (v_cus_prime, 'Prime Construction Co', 'Bala Murugan', '+91-9500988776', 'sourcing@primeconstruction.example', 'Porur, Chennai'),
    (v_cus_summit, 'Summit Logistics Pvt Ltd', 'Meena Kumari', '+91-9962200334', 'ops@summitlogistics.example', 'Sriperumbudur, Chennai');

  -- ---------------------------------------------------------------------
  -- Receipts (8: 3 done, 2 draft, 2 ready [one overdue], 1 canceled)
  -- ---------------------------------------------------------------------
  v_r1 := gen_random_uuid();
  insert into public.receipts (id, supplier_id, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_r1, v_sup_tools, v_wh_main, v_loc_main_fg, current_date - 35, 'done', 'Initial stock of drill machines.',
    now() - interval '36 days', now() - interval '35 days', now() - interval '36 days', now() - interval '35 days');
  insert into public.receipt_items (receipt_id, product_id, quantity, unit_cost) values
    (v_r1, v_p_drill_machine, 5, 2450.00);

  v_r2 := gen_random_uuid();
  insert into public.receipts (id, supplier_id, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_r2, v_sup_electronics, v_wh_main, v_loc_main_racka, current_date - 40, 'done', 'Electronics restock.',
    now() - interval '41 days', now() - interval '40 days', now() - interval '41 days', now() - interval '40 days');
  insert into public.receipt_items (receipt_id, product_id, quantity, unit_cost) values
    (v_r2, v_p_monitor, 21, 9800.00),
    (v_r2, v_p_keyboard, 35, 1200.00);

  v_r3 := gen_random_uuid();
  insert into public.receipts (id, supplier_id, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_r3, v_sup_steel, v_wh_prod, v_loc_prod_rawmat, current_date - 55, 'done', 'Opening stock of steel rod.',
    now() - interval '56 days', now() - interval '55 days', now() - interval '56 days', now() - interval '55 days');
  insert into public.receipt_items (receipt_id, product_id, quantity, unit_cost) values
    (v_r3, v_p_steel_rod, 950, 55.00);

  v_r4 := gen_random_uuid();
  insert into public.receipts (id, supplier_id, warehouse_id, location_id, scheduled_date, status, notes, created_at, updated_at)
  values (v_r4, v_sup_timber, v_wh_prod, v_loc_prod_rawmat, current_date + 7, 'draft', 'Awaiting confirmation.',
    now() - interval '2 days', now() - interval '2 days');
  insert into public.receipt_items (receipt_id, product_id, quantity, unit_cost) values
    (v_r4, v_p_wood_panel, 50, 620.00);

  v_r5 := gen_random_uuid();
  insert into public.receipts (id, supplier_id, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, created_at, updated_at)
  values (v_r5, v_sup_steel, v_wh_main, v_loc_main_racka, current_date + 5, 'ready', null,
    now() - interval '1 days', now() - interval '3 days', now() - interval '1 days');
  insert into public.receipt_items (receipt_id, product_id, quantity, unit_cost) values
    (v_r5, v_p_steel_sheet, 20, 850.00);

  v_r6 := gen_random_uuid();
  insert into public.receipts (id, supplier_id, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, created_at, updated_at)
  values (v_r6, v_sup_supplies, v_wh_main, v_loc_main_rackb, current_date - 4, 'ready', 'Supplier delayed dispatch — overdue.',
    now() - interval '6 days', now() - interval '8 days', now() - interval '6 days');
  insert into public.receipt_items (receipt_id, product_id, quantity, unit_cost) values
    (v_r6, v_p_screw_pack, 100, 45.00);

  v_r7 := gen_random_uuid();
  insert into public.receipts (id, supplier_id, warehouse_id, location_id, scheduled_date, status, notes, canceled_at, created_at, updated_at)
  values (v_r7, v_sup_tools, v_wh_main, v_loc_main_fg, current_date - 10, 'canceled', 'Supplier order canceled.',
    now() - interval '9 days', now() - interval '12 days', now() - interval '9 days');
  insert into public.receipt_items (receipt_id, product_id, quantity, unit_cost) values
    (v_r7, v_p_work_table, 5, 5400.00);

  v_r8 := gen_random_uuid();
  insert into public.receipts (id, supplier_id, warehouse_id, location_id, scheduled_date, status, notes, created_at, updated_at)
  values (v_r8, v_sup_electronics, v_wh_main, v_loc_main_racka, current_date + 10, 'draft', 'New laptop batch.',
    now() - interval '1 days', now() - interval '1 days');
  insert into public.receipt_items (receipt_id, product_id, quantity, unit_cost) values
    (v_r8, v_p_laptop, 10, 48000.00);

  -- Ledger entries for the 3 done receipts.
  insert into public.stock_ledger (id, product_id, warehouse_id, location_id, movement_type, quantity, reference_type, reference_id, to_location_id, unit_cost, created_at) values
    (gen_random_uuid(), v_p_drill_machine, v_wh_main, v_loc_main_fg, 'RECEIPT', 5, 'receipt', v_r1, v_loc_main_fg, 2450.00, now() - interval '35 days'),
    (gen_random_uuid(), v_p_monitor, v_wh_main, v_loc_main_racka, 'RECEIPT', 21, 'receipt', v_r2, v_loc_main_racka, 9800.00, now() - interval '40 days'),
    (gen_random_uuid(), v_p_keyboard, v_wh_main, v_loc_main_racka, 'RECEIPT', 35, 'receipt', v_r2, v_loc_main_racka, 1200.00, now() - interval '40 days'),
    (gen_random_uuid(), v_p_steel_rod, v_wh_prod, v_loc_prod_rawmat, 'RECEIPT', 950, 'receipt', v_r3, v_loc_prod_rawmat, 55.00, now() - interval '55 days');

  -- ---------------------------------------------------------------------
  -- Deliveries (11: 5 done, 1 draft, 2 waiting, 2 ready [one overdue], 1 canceled)
  -- ---------------------------------------------------------------------
  v_d1 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_d1, v_cus_prime, 'Porur, Chennai', 'sales_order', v_wh_main, v_loc_main_fg, current_date - 12, 'done', null,
    now() - interval '13 days', now() - interval '12 days', now() - interval '14 days', now() - interval '12 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d1, v_p_drill_machine, 2);

  v_d2 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_d2, v_cus_coastal, 'ECR, Chennai', 'sales_order', v_wh_main, v_loc_main_fg, current_date - 20, 'done', null,
    now() - interval '21 days', now() - interval '20 days', now() - interval '23 days', now() - interval '20 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d2, v_p_office_chair, 7);

  v_d3 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_d3, v_cus_horizon, 'T. Nagar, Chennai', 'sales_order', v_wh_main, v_loc_main_rackb, current_date - 10, 'done', 'Bulk packaging order — fully depleted stock.',
    now() - interval '11 days', now() - interval '10 days', now() - interval '13 days', now() - interval '10 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d3, v_p_packaging_box, 200);

  v_d4 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_d4, v_cus_technova, 'OMR, Chennai', 'sales_order', v_wh_main, v_loc_main_racka, current_date - 5, 'done', null,
    now() - interval '6 days', now() - interval '5 days', now() - interval '8 days', now() - interval '5 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d4, v_p_laptop, 8);

  v_d5 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_d5, v_cus_technova, 'OMR, Chennai', 'sales_order', v_wh_main, v_loc_main_racka, current_date - 16, 'done', null,
    now() - interval '17 days', now() - interval '16 days', now() - interval '19 days', now() - interval '16 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values
    (v_d5, v_p_monitor, 3),
    (v_d5, v_p_keyboard, 5);

  v_d6 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, created_at, updated_at)
  values (v_d6, v_cus_horizon, 'T. Nagar, Chennai', 'sales_order', v_wh_main, v_loc_main_racka, current_date + 5, 'draft', null,
    now() - interval '1 days', now() - interval '1 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d6, v_p_keyboard, 10);

  v_d7 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, created_at, updated_at)
  values (v_d7, v_cus_technova, 'OMR, Chennai', 'sales_order', v_wh_main, v_loc_main_racka, current_date + 3, 'waiting', 'Awaiting laptop restock.',
    now() - interval '2 days', now() - interval '3 days', now() - interval '2 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d7, v_p_laptop, 3);

  v_d8 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, created_at, updated_at)
  values (v_d8, v_cus_prime, 'Porur, Chennai', 'sales_order', v_wh_main, v_loc_main_fg, current_date + 2, 'waiting', 'Insufficient free stock at Finished Goods.',
    now() - interval '1 days', now() - interval '2 days', now() - interval '1 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d8, v_p_drill_machine, 5);

  v_d9 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, created_at, updated_at)
  values (v_d9, v_cus_summit, 'Sriperumbudur, Chennai', 'sales_order', v_wh_main, v_loc_main_rackb, current_date + 4, 'ready', null,
    now() - interval '1 days', now() - interval '2 days', now() - interval '1 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d9, v_p_screw_pack, 50);

  v_d10 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, canceled_at, created_at, updated_at)
  values (v_d10, v_cus_coastal, 'ECR, Chennai', 'sales_order', v_wh_north, v_loc_north_rackb, current_date - 10, 'canceled', 'Customer canceled order.',
    now() - interval '9 days', now() - interval '12 days', now() - interval '9 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d10, v_p_office_chair, 2);

  v_d11 := gen_random_uuid();
  insert into public.deliveries (id, customer_id, delivery_address, operation_type, warehouse_id, location_id, scheduled_date, status, notes, confirmed_at, created_at, updated_at)
  values (v_d11, v_cus_horizon, 'T. Nagar, Chennai', 'sales_order', v_wh_main, v_loc_main_racka, current_date - 3, 'ready', 'Ready but overdue for dispatch.',
    now() - interval '4 days', now() - interval '5 days', now() - interval '4 days');
  insert into public.delivery_items (delivery_id, product_id, quantity) values (v_d11, v_p_safety_helmet, 5);

  -- Ledger entries for the 5 done deliveries.
  insert into public.stock_ledger (id, product_id, warehouse_id, location_id, movement_type, quantity, reference_type, reference_id, from_location_id, created_at) values
    (gen_random_uuid(), v_p_drill_machine, v_wh_main, v_loc_main_fg, 'DELIVERY', -2, 'delivery', v_d1, v_loc_main_fg, now() - interval '12 days'),
    (gen_random_uuid(), v_p_office_chair, v_wh_main, v_loc_main_fg, 'DELIVERY', -7, 'delivery', v_d2, v_loc_main_fg, now() - interval '20 days'),
    (gen_random_uuid(), v_p_packaging_box, v_wh_main, v_loc_main_rackb, 'DELIVERY', -200, 'delivery', v_d3, v_loc_main_rackb, now() - interval '10 days'),
    (gen_random_uuid(), v_p_laptop, v_wh_main, v_loc_main_racka, 'DELIVERY', -8, 'delivery', v_d4, v_loc_main_racka, now() - interval '5 days'),
    (gen_random_uuid(), v_p_monitor, v_wh_main, v_loc_main_racka, 'DELIVERY', -3, 'delivery', v_d5, v_loc_main_racka, now() - interval '16 days'),
    (gen_random_uuid(), v_p_keyboard, v_wh_main, v_loc_main_racka, 'DELIVERY', -5, 'delivery', v_d5, v_loc_main_racka, now() - interval '16 days');

  -- ---------------------------------------------------------------------
  -- Internal transfers (6: 3 done, 1 ready, 1 draft, 1 canceled)
  -- ---------------------------------------------------------------------
  v_t1 := gen_random_uuid();
  insert into public.internal_transfers (id, source_warehouse_id, source_location_id, dest_warehouse_id, dest_location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_t1, v_wh_prod, v_loc_prod_rawmat, v_wh_main, v_loc_main_racka, current_date - 20, 'done', 'Move steel rod to Main Warehouse for fabrication orders.',
    now() - interval '21 days', now() - interval '20 days', now() - interval '22 days', now() - interval '20 days');
  insert into public.internal_transfer_items (transfer_id, product_id, quantity) values (v_t1, v_p_steel_rod, 150);

  v_t2 := gen_random_uuid();
  insert into public.internal_transfers (id, source_warehouse_id, source_location_id, dest_warehouse_id, dest_location_id, scheduled_date, status, notes, confirmed_at, created_at, updated_at)
  values (v_t2, v_wh_prod, v_loc_prod_rawmat, v_wh_main, v_loc_main_racka, current_date + 3, 'ready', null,
    now() - interval '1 days', now() - interval '2 days', now() - interval '1 days');
  insert into public.internal_transfer_items (transfer_id, product_id, quantity) values (v_t2, v_p_wood_panel, 10);

  v_t3 := gen_random_uuid();
  insert into public.internal_transfers (id, source_warehouse_id, source_location_id, dest_warehouse_id, dest_location_id, scheduled_date, status, notes, created_at, updated_at)
  values (v_t3, v_wh_main, v_loc_main_rackb, v_wh_north, v_loc_north_rackb, current_date + 6, 'draft', null,
    now() - interval '1 days', now() - interval '1 days');
  insert into public.internal_transfer_items (transfer_id, product_id, quantity) values (v_t3, v_p_screw_pack, 50);

  v_t4 := gen_random_uuid();
  insert into public.internal_transfers (id, source_warehouse_id, source_location_id, dest_warehouse_id, dest_location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_t4, v_wh_main, v_loc_main_racka, v_wh_north, v_loc_north_racka, current_date - 25, 'done', 'Balance monitors across warehouses.',
    now() - interval '26 days', now() - interval '25 days', now() - interval '27 days', now() - interval '25 days');
  insert into public.internal_transfer_items (transfer_id, product_id, quantity) values (v_t4, v_p_monitor, 6);

  v_t5 := gen_random_uuid();
  insert into public.internal_transfers (id, source_warehouse_id, source_location_id, dest_warehouse_id, dest_location_id, scheduled_date, status, notes, confirmed_at, done_at, created_at, updated_at)
  values (v_t5, v_wh_main, v_loc_main_racka, v_wh_north, v_loc_north_racka, current_date - 22, 'done', 'Balance keyboards across warehouses.',
    now() - interval '23 days', now() - interval '22 days', now() - interval '24 days', now() - interval '22 days');
  insert into public.internal_transfer_items (transfer_id, product_id, quantity) values (v_t5, v_p_keyboard, 10);

  v_t6 := gen_random_uuid();
  insert into public.internal_transfers (id, source_warehouse_id, source_location_id, dest_warehouse_id, dest_location_id, scheduled_date, status, notes, canceled_at, created_at, updated_at)
  values (v_t6, v_wh_main, v_loc_main_racka, v_wh_north, v_loc_north_racka, current_date - 8, 'canceled', 'No longer needed.',
    now() - interval '7 days', now() - interval '9 days', now() - interval '7 days');
  insert into public.internal_transfer_items (transfer_id, product_id, quantity) values (v_t6, v_p_safety_helmet, 5);

  -- Ledger entries for the 3 done transfers.
  insert into public.stock_ledger (id, product_id, warehouse_id, location_id, movement_type, quantity, reference_type, reference_id, from_location_id, to_location_id, created_at) values
    (gen_random_uuid(), v_p_steel_rod, v_wh_main, v_loc_main_racka, 'TRANSFER', 150, 'transfer', v_t1, v_loc_prod_rawmat, v_loc_main_racka, now() - interval '20 days'),
    (gen_random_uuid(), v_p_monitor, v_wh_north, v_loc_north_racka, 'TRANSFER', 6, 'transfer', v_t4, v_loc_main_racka, v_loc_north_racka, now() - interval '25 days'),
    (gen_random_uuid(), v_p_keyboard, v_wh_north, v_loc_north_racka, 'TRANSFER', 10, 'transfer', v_t5, v_loc_main_racka, v_loc_north_racka, now() - interval '22 days');

  -- ---------------------------------------------------------------------
  -- Stock adjustments (6: 3 done, 2 draft, 1 canceled — varied reasons)
  -- ---------------------------------------------------------------------
  v_a1 := gen_random_uuid();
  insert into public.stock_adjustments (id, warehouse_id, location_id, reason, notes, status, done_at, created_at, updated_at)
  values (v_a1, v_wh_prod, v_loc_prod_rawmat, 'damaged', 'Water damage found during weekly check.', 'done',
    now() - interval '15 days', now() - interval '16 days', now() - interval '15 days');
  insert into public.stock_adjustment_items (adjustment_id, product_id, counted_quantity, system_quantity, difference) values
    (v_a1, v_p_wood_panel, 60, 65, -5);

  v_a2 := gen_random_uuid();
  insert into public.stock_adjustments (id, warehouse_id, location_id, reason, notes, status, done_at, created_at, updated_at)
  values (v_a2, v_wh_main, v_loc_main_racka, 'physical_count', 'Quarterly cycle count.', 'done',
    now() - interval '10 days', now() - interval '11 days', now() - interval '10 days');
  insert into public.stock_adjustment_items (adjustment_id, product_id, counted_quantity, system_quantity, difference) values
    (v_a2, v_p_safety_helmet, 15, 18, -3);

  v_a3 := gen_random_uuid();
  insert into public.stock_adjustments (id, warehouse_id, location_id, reason, notes, status, done_at, created_at, updated_at)
  values (v_a3, v_wh_main, v_loc_main_rackb, 'found', 'Extra units found during rack reorganization.', 'done',
    now() - interval '8 days', now() - interval '9 days', now() - interval '8 days');
  insert into public.stock_adjustment_items (adjustment_id, product_id, counted_quantity, system_quantity, difference) values
    (v_a3, v_p_screw_pack, 250, 245, 5);

  v_a4 := gen_random_uuid();
  insert into public.stock_adjustments (id, warehouse_id, location_id, reason, notes, status, created_at, updated_at)
  values (v_a4, v_wh_north, v_loc_north_racka, 'lost', 'Suspected shrinkage, pending review.', 'draft',
    now() - interval '1 days', now() - interval '1 days');
  insert into public.stock_adjustment_items (adjustment_id, product_id, counted_quantity) values
    (v_a4, v_p_keyboard, 8);

  v_a5 := gen_random_uuid();
  insert into public.stock_adjustments (id, warehouse_id, location_id, reason, notes, status, created_at, updated_at)
  values (v_a5, v_wh_north, v_loc_north_rackb, 'data_correction', 'Correcting a prior data entry error.', 'draft',
    now() - interval '2 days', now() - interval '2 days');
  insert into public.stock_adjustment_items (adjustment_id, product_id, counted_quantity) values
    (v_a5, v_p_office_chair, 6);

  v_a6 := gen_random_uuid();
  insert into public.stock_adjustments (id, warehouse_id, location_id, reason, notes, status, canceled_at, created_at, updated_at)
  values (v_a6, v_wh_main, v_loc_main_fg, 'other', 'Duplicate adjustment, canceled.', 'canceled',
    now() - interval '3 days', now() - interval '5 days', now() - interval '3 days');
  insert into public.stock_adjustment_items (adjustment_id, product_id, counted_quantity) values
    (v_a6, v_p_work_table, 3);

  -- Ledger entries for the 3 done adjustments.
  insert into public.stock_ledger (id, product_id, warehouse_id, location_id, movement_type, quantity, reference_type, reference_id, reason, created_at) values
    (gen_random_uuid(), v_p_wood_panel, v_wh_prod, v_loc_prod_rawmat, 'ADJUSTMENT', -5, 'stock_adjustment', v_a1, 'damaged', now() - interval '15 days'),
    (gen_random_uuid(), v_p_safety_helmet, v_wh_main, v_loc_main_racka, 'ADJUSTMENT', -3, 'stock_adjustment', v_a2, 'physical_count', now() - interval '10 days'),
    (gen_random_uuid(), v_p_screw_pack, v_wh_main, v_loc_main_rackb, 'ADJUSTMENT', 5, 'stock_adjustment', v_a3, 'found', now() - interval '8 days');

  -- ---------------------------------------------------------------------
  -- Generic "opening balance" ledger rows for stock not tied to one of the
  -- documents above (movement_type=ADJUSTMENT / reason=initial_stock /
  -- reference_type='seed', matching the "initial_stock" concept already
  -- described on public.products).
  -- ---------------------------------------------------------------------
  insert into public.stock_ledger (id, product_id, warehouse_id, location_id, movement_type, quantity, reference_type, reason, created_at) values
    (gen_random_uuid(), v_p_steel_sheet, v_wh_prod, v_loc_prod_rawmat, 'ADJUSTMENT', 15, 'seed', 'initial_stock', now() - interval '55 days'),
    (gen_random_uuid(), v_p_steel_sheet, v_wh_main, v_loc_main_racka, 'ADJUSTMENT', 10, 'seed', 'initial_stock', now() - interval '55 days'),
    (gen_random_uuid(), v_p_wood_panel, v_wh_prod, v_loc_prod_rawmat, 'ADJUSTMENT', 65, 'seed', 'initial_stock', now() - interval '55 days'),
    (gen_random_uuid(), v_p_wood_panel, v_wh_north, v_loc_north_racka, 'ADJUSTMENT', 20, 'seed', 'initial_stock', now() - interval '55 days'),
    (gen_random_uuid(), v_p_screw_pack, v_wh_main, v_loc_main_rackb, 'ADJUSTMENT', 245, 'seed', 'initial_stock', now() - interval '55 days'),
    (gen_random_uuid(), v_p_screw_pack, v_wh_north, v_loc_north_rackb, 'ADJUSTMENT', 100, 'seed', 'initial_stock', now() - interval '55 days'),
    (gen_random_uuid(), v_p_packaging_box, v_wh_main, v_loc_main_rackb, 'ADJUSTMENT', 200, 'seed', 'initial_stock', now() - interval '50 days'),
    (gen_random_uuid(), v_p_safety_helmet, v_wh_main, v_loc_main_racka, 'ADJUSTMENT', 18, 'seed', 'initial_stock', now() - interval '55 days'),
    (gen_random_uuid(), v_p_drill_machine, v_wh_prod, v_loc_prod_assy, 'ADJUSTMENT', 1, 'seed', 'initial_stock', now() - interval '48 days'),
    (gen_random_uuid(), v_p_office_chair, v_wh_main, v_loc_main_fg, 'ADJUSTMENT', 25, 'seed', 'initial_stock', now() - interval '55 days'),
    (gen_random_uuid(), v_p_office_chair, v_wh_north, v_loc_north_rackb, 'ADJUSTMENT', 5, 'seed', 'initial_stock', now() - interval '50 days'),
    (gen_random_uuid(), v_p_work_table, v_wh_main, v_loc_main_fg, 'ADJUSTMENT', 2, 'seed', 'initial_stock', now() - interval '55 days'),
    (gen_random_uuid(), v_p_laptop, v_wh_main, v_loc_main_racka, 'ADJUSTMENT', 8, 'seed', 'initial_stock', now() - interval '45 days');

  -- ---------------------------------------------------------------------
  -- Final inventory_balances — the state all of the ledger history above
  -- reconciles to. 2 out-of-stock products (Packaging Box, Laptop) and
  -- several low/at-reorder-point products (Steel Sheet, Safety Helmet,
  -- Drill Machine, Work Table).
  -- ---------------------------------------------------------------------
  insert into public.inventory_balances (product_id, location_id, quantity_on_hand) values
    (v_p_steel_rod, v_loc_prod_rawmat, 800),
    (v_p_steel_rod, v_loc_main_racka, 150),
    (v_p_steel_sheet, v_loc_prod_rawmat, 15),
    (v_p_steel_sheet, v_loc_main_racka, 10),
    (v_p_wood_panel, v_loc_prod_rawmat, 60),
    (v_p_wood_panel, v_loc_north_racka, 20),
    (v_p_screw_pack, v_loc_main_rackb, 250),
    (v_p_screw_pack, v_loc_north_rackb, 100),
    (v_p_packaging_box, v_loc_main_rackb, 0),
    (v_p_safety_helmet, v_loc_main_racka, 15),
    (v_p_drill_machine, v_loc_main_fg, 3),
    (v_p_drill_machine, v_loc_prod_assy, 1),
    (v_p_office_chair, v_loc_main_fg, 18),
    (v_p_office_chair, v_loc_north_rackb, 5),
    (v_p_work_table, v_loc_main_fg, 2),
    (v_p_laptop, v_loc_main_racka, 0),
    (v_p_monitor, v_loc_main_racka, 12),
    (v_p_monitor, v_loc_north_racka, 6),
    (v_p_keyboard, v_loc_main_racka, 20),
    (v_p_keyboard, v_loc_north_racka, 10);

end $$;
