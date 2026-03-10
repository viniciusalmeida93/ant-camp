const url = 'https://jxuhmqctiyeheamhviob.supabase.co/rest/v1/payments?select=id,payment_method,status,asaas_payment_id,pix_copy_paste,created_at&order=created_at.desc&limit=10';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2)));
