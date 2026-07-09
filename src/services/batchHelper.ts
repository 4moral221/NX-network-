export async function openOrGetBatch(supabase: any, sku_code: string | null, variant_code: string | null, qty: number) {
  try {
    if (!sku_code) {
        // Return null data but no error, so callers don't trigger "Failed to batch" alerts
        return { data: null, error: null };
    }

    const { data: batchId, error: rpcErr } = await supabase.rpc('open_or_get_batch', {
      p_sku: sku_code,
      p_variant: variant_code || null
    });

    if (rpcErr) throw rpcErr;
    return { data: batchId, error: null };
  } catch (err: any) {
    console.error('openOrGetBatch error:', err);
    return { data: null, error: err };
  }
}

export async function refreshBatchTotals(supabase: any, batchId: number | string) {
    try {
        const { error: rpcErr } = await supabase.rpc('refresh_batch_totals', {
            p_batch_id: typeof batchId === 'string' ? parseInt(batchId, 10) : batchId
        });

        if (rpcErr) throw rpcErr;
        return { error: null };
    } catch (err: any) {
        console.error('refreshBatchTotals error:', err);
        return { error: err };
    }
}
