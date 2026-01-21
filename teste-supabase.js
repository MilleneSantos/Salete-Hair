const url =
  "https://amouuywirdvgurihvl.supabase.co/rest/v1/services?select=id";

fetch(url, {
  headers: {
    apikey: "sb_publishable_j3OS2no5d-r12SKqqerVUQ_kJnXsr2b",
    Authorization: "Bearer sb_publishable_j3OS2no5d-r12SKqqerVUQ_kJnXsr2b",
  },
})
  .then((r) => r.text())
  .then((t) => {
    console.log("Resposta do Supabase:");
    console.log(t);
  })
  .catch((e) => {
    console.error("ERRO DE CONEXÃO:", e.message);
  });