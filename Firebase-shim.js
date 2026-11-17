// Liga o jogo ao Firebase sem mexer no código do jogo: define window.claude.use('user' | 'db' | 'room')
// com a mesma interface que o jogo já usa. Carregue ANTES do script do jogo.
(function () {
  var cfg = window.FIREBASE_CONFIG || {};
  var ok = cfg.apiKey && String(cfg.apiKey).indexOf('COLE') !== 0 && cfg.projectId && String(cfg.projectId).indexOf('SEU-') !== 0;
  var V = '10.14.1', B = 'https://www.gstatic.com/firebasejs/' + V + '/';
  var fbp = null;
  function load() {
    if (!ok) return Promise.resolve(null);
    if (fbp) return fbp;
    fbp = (async function () {
      var m = await Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js'), import(B + 'firebase-firestore.js'), import(B + 'firebase-database.js')]);
      var app = m[0], auth = m[1], fs = m[2], rtdb = m[3];
      var a = app.initializeApp(cfg);
      var au = auth.getAuth(a);
      await au.authStateReady();
      return { auth: auth, fs: fs, rtdb: rtdb, au: au, db: fs.getFirestore(a), rt: rtdb.getDatabase(a) };
    })().catch(function (e) { console.error('Firebase nao carregou', e); return null; });
    return fbp;
  }
  var DOM = '@lostcity.invalid'; // usuario vira um e-mail ficticio (nunca enviado); senha/Google funcionam normal
  var emailOf = function (u) { return String(u).trim().toLowerCase() + DOM; };
  var uid = function (F) { return F.au.currentUser ? F.au.currentUser.uid : null; };

  window.trilhoAuth = ok ? {
    login: async function () { var F = await load(); if (!F) throw { code: 'sem-firebase' }; await F.auth.signInWithPopup(F.au, new F.auth.GoogleAuthProvider()); location.reload(); },
    loginUser: async function (u, pw) { var F = await load(); if (!F) throw { code: 'sem-firebase' }; await F.auth.signInWithEmailAndPassword(F.au, emailOf(u), pw); location.reload(); },
    signup: async function (u, pw) { var F = await load(); if (!F) throw { code: 'sem-firebase' }; var c = await F.auth.createUserWithEmailAndPassword(F.au, emailOf(u), pw); try { await F.auth.updateProfile(c.user, { displayName: String(u).trim().toLowerCase() }); } catch (e) {} location.reload(); },
    logout: async function () { var F = await load(); if (F) await F.auth.signOut(F.au); location.reload(); }
  } : null;

  function userNs(F) {
    return {
      id: async function () { return uid(F); },
      isOwner: async function () { return !!(window.TRILHO_ADMIN_UID && uid(F) === window.TRILHO_ADMIN_UID); },
      me: async function () { var u = F.au.currentUser; return { id: u ? u.uid : null, name: u && u.displayName ? u.displayName : '' }; }
    };
  }
  function dbNs(F) {
    var fs = F.fs;
    return {
      collection: function (c) {
        return {
          onSnapshot: function (next, err) {
            return fs.onSnapshot(fs.query(fs.collection(F.db, c), fs.limit(300)),
              function (s) { next({ docs: s.docs.map(function (d) { return { id: d.id, data: function () { return d.data(); } }; }) }); },
              function (e) { if (err) err({ code: e && e.code || 'erro' }); });
          }
        };
      },
      doc: function (p) {
        var ref = fs.doc(F.db, p);
        return {
          get: async function () { var s = await fs.getDoc(ref); return { exists: s.exists(), data: function () { return s.data(); } }; },
          set: function (d) { return fs.setDoc(ref, d); },
          delete: function () { return fs.deleteDoc(ref); }
        };
      }
    };
  }
  function roomNs(F) {
    var rtdb = F.rtdb, me = uid(F);
    if (!me) return null;
    return {
      join: async function (name) {
        var base = 'rooms/' + name, myPeer = me + '-' + Math.random().toString(36).slice(2, 8);
        var meRef = rtdb.ref(F.rt, base + '/' + myPeer), roomRef = rtdb.ref(F.rt, base);
        var presence = {}, listeners = [], cache = {}, snapPeers = null, dirty = false, timer = 0, left = false;
        rtdb.onDisconnect(meRef).remove();
        function flush() {
          timer = 0;
          if (!dirty || left) return;
          dirty = false;
          rtdb.set(meRef, { p: Object.assign({}, presence) }).catch(function () {});
        }
        var unsub = rtdb.onValue(roomRef, function (snap) {
          var v = snap.val() || {}, now = Date.now(), list = [], k;
          for (k in v) {
            var pr = (v[k] && v[k].p) || {}, sig = JSON.stringify(pr), prev = cache[k];
            if (!prev || prev.sig !== sig) { prev = cache[k] = { sig: sig, updatedAt: now, presence: Object.freeze(pr) }; }
            list.push({ peer: k, presence: prev.presence, updatedAt: prev.updatedAt, isMe: k.indexOf(me + '-') === 0, sameTab: k === myPeer, kind: 'viewer', by: null, guest: false });
          }
          for (k in cache) if (!(k in v)) delete cache[k];
          snapPeers = list;
          listeners.slice().forEach(function (f) { f({ peers: snapPeers }); });
        });
        return {
          name: name,
          presence: async function (patch) {
            for (var k in patch) { if (patch[k] === null) delete presence[k]; else presence[k] = patch[k]; }
            dirty = true;
            if (!timer) timer = setTimeout(flush, 60);
          },
          peers: function () { return snapPeers || []; },
          onPeers: function (h) {
            listeners.push(h);
            if (snapPeers) setTimeout(function () { h({ peers: snapPeers }); }, 0);
            return function () { listeners = listeners.filter(function (x) { return x !== h; }); };
          },
          connected: function () { return true; },
          leave: async function () {
            left = true; clearTimeout(timer); listeners = [];
            try { unsub(); } catch (e) {}
            try { await rtdb.remove(meRef); } catch (e) {}
          }
        };
      }
    };
  }
  window.claude = {
    use: async function (name) {
      var F = await load();
      if (!F) return null;
      if (name === 'user') return userNs(F);
      if (name === 'db') return dbNs(F);
      if (name === 'room') return roomNs(F);
      return null;
    }
  };
})();
 
