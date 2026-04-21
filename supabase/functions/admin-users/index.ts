// Admin user management: create, update, delete users
// verify_jwt = false (validates JWT in-code via getClaims to support ES256 keys)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Cliente com o token do usuário, usado para validar identidade via getClaims
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Valida o token e obtém o user id (compatível com qualquer versão do SDK)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      console.error("Auth error:", userErr);
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    // Verifica se o usuário chamador é admin (via service role para evitar problemas com RLS)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) {
      console.error("Role check error:", roleErr);
      return new Response(JSON.stringify({ error: "Erro ao verificar permissões" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, nome, cargo, role } = body;
      if (!email || !password || !nome) {
        return new Response(JSON.stringify({ error: "email, password e nome são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, cargo, role },
      });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        let friendly = error.message;
        let status = 400;
        if (msg.includes("already been registered") || msg.includes("already registered") || msg.includes("duplicate")) {
          friendly = "Já existe um usuário cadastrado com este e-mail.";
          status = 409;
        } else if (msg.includes("invalid") && msg.includes("email")) {
          friendly = "E-mail inválido. Verifique o formato.";
        } else if (msg.includes("password")) {
          friendly = "Senha inválida. Tente outra.";
        }
        console.error("createUser error:", error);
        return new Response(JSON.stringify({ error: friendly }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Garante profile e role (caso o trigger handle_new_user falhe ou não exista)
      const newUserId = data.user?.id;
      if (newUserId) {
        await admin.from("profiles").upsert(
          { user_id: newUserId, nome, cargo: cargo ?? "Operador", ativo: true },
          { onConflict: "user_id" },
        );
        await admin.from("user_roles").delete().eq("user_id", newUserId);
        await admin.from("user_roles").insert({ user_id: newUserId, role: role ?? "operador" });
      }
      return new Response(JSON.stringify({ user: data.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { user_id, email, password, nome, cargo, role } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const updateAuth: Record<string, string> = {};
      if (email) updateAuth.email = email;
      if (password) updateAuth.password = password;
      if (Object.keys(updateAuth).length) {
        const { error } = await admin.auth.admin.updateUserById(user_id, updateAuth);
        if (error) {
          console.error("updateUserById error:", error);
          const msg = (error.message || "").toLowerCase();
          let friendly = error.message;
          let status = 400;
          if (msg.includes("already been registered") || msg.includes("already registered") || msg.includes("duplicate")) {
            friendly = "Já existe outro usuário com este e-mail.";
            status = 409;
          }
          return new Response(JSON.stringify({ error: friendly }), {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      if (nome !== undefined || cargo !== undefined) {
        const { error } = await admin
          .from("profiles")
          .update({
            ...(nome !== undefined && { nome }),
            ...(cargo !== undefined && { cargo }),
          })
          .eq("user_id", user_id);
        if (error) {
          console.error("profiles update error:", error);
          throw error;
        }
      }
      if (role) {
        // remove TODOS os roles atuais (inclusive duplicatas) e insere o novo
        const { error: delErr } = await admin.from("user_roles").delete().eq("user_id", user_id);
        if (delErr) {
          console.error("user_roles delete error:", delErr);
          throw delErr;
        }
        const { error: insErr } = await admin.from("user_roles").insert({ user_id, role });
        if (insErr) {
          console.error("user_roles insert error:", insErr);
          throw insErr;
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (user_id === callerId) {
        return new Response(JSON.stringify({ error: "Você não pode excluir seu próprio usuário." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verifica vínculos: se houver lotes, itens ou movimentações, faz soft delete (desativa)
      const [{ count: lotesCount }, { count: itensCount }, { count: movsCount }] = await Promise.all([
        admin.from("lotes").select("id", { count: "exact", head: true }).eq("operador_id", user_id),
        admin.from("itens_lote").select("id", { count: "exact", head: true }).eq("criado_por", user_id),
        admin.from("movimentacoes").select("id", { count: "exact", head: true }).eq("usuario_id", user_id),
      ]);
      const totalVinculos = (lotesCount ?? 0) + (itensCount ?? 0) + (movsCount ?? 0);

      if (totalVinculos > 0) {
        // Soft delete: desativa o usuário e bloqueia login (sem remover histórico)
        const { error: profErr } = await admin
          .from("profiles")
          .update({ ativo: false })
          .eq("user_id", user_id);
        if (profErr) {
          console.error("soft delete profile error:", profErr);
          throw profErr;
        }
        // Bloqueia login banindo o usuário (100 anos)
        const { error: banErr } = await admin.auth.admin.updateUserById(user_id, {
          ban_duration: "876000h",
        });
        if (banErr) console.error("ban user error:", banErr);

        return new Response(
          JSON.stringify({
            ok: true,
            soft_deleted: true,
            message: `Usuário desativado (possui ${totalVinculos} registro(s) vinculado(s)).`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Sem vínculos: exclusão definitiva
      const { error: rolesErr } = await admin.from("user_roles").delete().eq("user_id", user_id);
      if (rolesErr) console.error("delete user_roles error:", rolesErr);

      const { error: profErr } = await admin.from("profiles").delete().eq("user_id", user_id);
      if (profErr) console.error("delete profiles error:", profErr);

      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) {
        console.error("auth deleteUser error:", error);
        throw error;
      }
      return new Response(JSON.stringify({ ok: true, soft_deleted: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reactivate") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: profErr } = await admin
        .from("profiles")
        .update({ ativo: true })
        .eq("user_id", user_id);
      if (profErr) throw profErr;
      const { error: unbanErr } = await admin.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });
      if (unbanErr) console.error("unban user error:", unbanErr);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("admin-users error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
