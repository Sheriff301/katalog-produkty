const supabaseUrl = 'https://prpycsgjzihsjmsqymyt.supabase.co'; 
const supabaseKey = 'sb_publishable_TZ4EklfptNyLtDmtC4ULHg_7PkZCteK'; 

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let wszystkieProdukty = [];
let koszyk = [];
let aktualnyUzytkownik = null;

// ---- SYSTEM LOGOWANIA (AUTH) ----

// Sprawdzanie sesji przy uruchomieniu
async function inicjalizacjaAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    aktualizujInterfejsUzytkownika(session?.user || null);

    // Nasłuchiwanie zmian logowania
    supabaseClient.auth.onAuthStateChange((event, session) => {
        aktualizujInterfejsUzytkownika(session?.user || null);
    });
}

function aktualizujInterfejsUzytkownika(user) {
    aktualnyUzytkownik = user;
    const btnKonto = document.getElementById('btn-konto');
    const btnWyloguj = document.getElementById('btn-wyloguj');
    const btnStatus = document.getElementById('btn-status');
    const infoLogowanie = document.getElementById('wymagane-logowanie-info');
    const formDanych = document.getElementById('formularz-danych');

    if (user) {
        btnKonto.classList.add('ukryty');
        btnWyloguj.classList.remove('ukryty');
        btnStatus.classList.remove('ukryty');
        infoLogowanie.classList.add('ukryty');
        formDanych.classList.remove('ukryty');
        pobierzMojeZamowienia(); // Pobiera zamówienia dla zalogowanego
        if(document.getElementById('sekcja-logowanie').classList.contains('aktywna')){
            zmienSekcje('cennik');
        }
    } else {
        btnKonto.classList.remove('ukryty');
        btnWyloguj.classList.add('ukryty');
        btnStatus.classList.add('ukryty');
        infoLogowanie.classList.remove('ukryty');
        formDanych.classList.add('ukryty');
    }
}

async function zarejestrujKlienta() {
    const email = document.getElementById('auth-email').value;
    const haslo = document.getElementById('auth-haslo').value;
    if(haslo.length < 6) return alert("Hasło musi mieć minimum 6 znaków!");

    const { data, error } = await supabaseClient.auth.signUp({ email: email, password: haslo });
    if (error) alert("Błąd rejestracji: " + error.message);
    else alert("Konto zostało utworzone! Jesteś zalogowany.");
}

async function zalogujKlienta() {
    const email = document.getElementById('auth-email').value;
    const haslo = document.getElementById('auth-haslo').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: haslo });
    if (error) alert("Błąd logowania: Błędny email lub hasło.");
    else alert("Zalogowano pomyślnie!");
}

async function wylogujKlienta() {
    await supabaseClient.auth.signOut();
    alert("Wylogowano!");
    zmienSekcje('cennik');
}

// ---- KATALOG I PRODUKTY ----

async function pobierzCennik() {
    const { data, error } = await supabaseClient.from('produkty').select('*');
    if (error) return console.error(error);
    wszystkieProdukty = data;
    wyswietlKatalog(wszystkieProdukty, 'katalog-pojemnik');
    wygenerujKategorieDropdown();
}

function wyswietlKatalog(produkty, docelowyPojemnikId) {
    const pojemnik = document.getElementById(docelowyPojemnikId);
    pojemnik.innerHTML = ''; 
    
    produkty.forEach(przedmiot => {
        const karta = document.createElement('div');
        karta.className = 'produkt-karta';
        const maObraz = przedmiot.zdjecie_url && przedmiot.zdjecie_url.length > 10;
        const imgTag = maObraz ? `<img src="${przedmiot.zdjecie_url}" onclick="pokazSzczegoly('${przedmiot.id}')">` : `<div style="height:200px; background:#121214; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="pokazSzczegoly('${przedmiot.id}')">Brak zdjęcia</div>`;

        karta.innerHTML = `
            <div>
                ${imgTag}
                <span class="kategoria">${przedmiot.kategoria || 'Inne'}</span>
                <h3 onclick="pokazSzczegoly('${przedmiot.id}')">${przedmiot.nazwa}</h3>
                <p class="opis">${przedmiot.opis || 'Brak opisu...'}</p>
            </div>
            <div style="margin-top: 15px;">
                <p class="cena">${przedmiot.cena} zł</p>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button class="btn-akcja" style="flex:1;" onclick="pokazSzczegoly('${przedmiot.id}')">Szczegóły</button>
                    <button class="btn-akcja" style="flex:1; background-color:#2196F3; color:white;" onclick="dodajDoKoszyka('${przedmiot.id}')">🛒 Dodaj</button>
                </div>
            </div>
        `;
        pojemnik.appendChild(karta);
    });
}

function pokazSzczegoly(idProduktu) {
    const produkt = wszystkieProdukty.find(p => String(p.id) === String(idProduktu));
    if (!produkt) return;
    const pojemnikSzczegolow = document.getElementById('szczegoly-pojemnik');
    const imgTag = (produkt.zdjecie_url && produkt.zdjecie_url.length > 10) ? `<img src="${produkt.zdjecie_url}">` : `<span>Brak dostępnego zdjęcia</span>`;

    pojemnikSzczegolow.innerHTML = `
        <div class="szczegoly-widok">
            <div class="szczegoly-obraz">${imgTag}</div>
            <div class="szczegoly-info">
                <span class="kategoria" style="align-self: flex-start;">${produkt.kategoria || 'Inne'}</span>
                <h2>${produkt.nazwa}</h2>
                <p class="cena">${produkt.cena} zł</p>
                <h4 style="color: #fff; border-bottom: 1px solid #29292e; padding-bottom: 10px;">Opis produktu:</h4>
                <p class="opis-pelny">${produkt.opis || 'Brak opisu.'}</p>
                <button class="btn-akcja" style="margin-top: 20px; font-size:1.1rem; background-color:#2196F3; color:white;" onclick="dodajDoKoszyka('${produkt.id}')">🛒 Dodaj do koszyka</button>
            </div>
        </div>
    `;
    zmienSekcje('szczegoly');
}

// ---- KOSZYK ----

function dodajDoKoszyka(id) {
    const produkt = wszystkieProdukty.find(p => String(p.id) === String(id));
    if (!produkt) return;
    const istniejacy = koszyk.find(p => String(p.id) === String(id));
    if (istniejacy) istniejacy.ilosc += 1;
    else koszyk.push({ ...produkt, ilosc: 1 });
    aktualizujWidokKoszyka();
    alert(`Dodano: ${produkt.nazwa}`); 
}

function zmienIloscKoszyka(id, zmiana) {
    const element = koszyk.find(p => String(p.id) === String(id));
    if (!element) return;
    element.ilosc += zmiana;
    if (element.ilosc <= 0) koszyk = koszyk.filter(p => String(p.id) !== String(id));
    aktualizujWidokKoszyka();
}

function aktualizujWidokKoszyka() {
    const licznik = document.getElementById('koszyk-licznik');
    const listaPojemnik = document.getElementById('koszyk-lista-elementow');
    const panelZamowienia = document.getElementById('panel-zamowienia');
    const sumaKwota = document.getElementById('koszyk-suma-kwota');

    let sumaCalkowita = 0; let sumaIlosc = 0;
    listaPojemnik.innerHTML = '';

    if (koszyk.length === 0) {
        listaPojemnik.innerHTML = '<p style="color: #a8a8b3;">Twój koszyk jest pusty.</p>';
        panelZamowienia.classList.add('ukryty');
        licznik.innerText = '0';
        return;
    }
    panelZamowienia.classList.remove('ukryty');

    koszyk.forEach(item => {
        const koszt = item.cena * item.ilosc;
        sumaCalkowita += koszt; sumaIlosc += item.ilosc;
        listaPojemnik.innerHTML += `
            <div class="koszyk-element">
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #fff;">${item.nazwa}</h4>
                    <span style="color: #a8a8b3; font-size: 0.9rem;">Cena szt: ${item.cena} zł | Łącznie: ${koszt.toFixed(2)} zł</span>
                </div>
                <div class="koszyk-kontrola">
                    <button onclick="zmienIloscKoszyka('${item.id}', -1)">-</button>
                    <span style="font-weight: bold; width: 20px; text-align: center;">${item.ilosc}</span>
                    <button onclick="zmienIloscKoszyka('${item.id}', 1)">+</button>
                    <button class="btn-usun" onclick="zmienIloscKoszyka('${item.id}', -9999)">Usuń</button>
                </div>
            </div>
        `;
    });
    licznik.innerText = sumaIlosc;
    sumaKwota.innerText = sumaCalkowita.toFixed(2);
}

// ---- SKŁADANIE ZAMÓWIENIA ----

async function zlozZamowienie() {
    if(!aktualnyUzytkownik) return alert("Musisz być zalogowany, aby złożyć zamówienie!");
    if(koszyk.length === 0) return alert("Koszyk jest pusty!");

    const imie = document.getElementById('zam-imie').value.trim();
    const telefon = document.getElementById('zam-telefon').value.trim();
    const adres = document.getElementById('zam-adres').value.trim();
    const metoda = document.getElementById('zam-metoda').value;

    if (!imie || !telefon || !adres) return alert("Wypełnij wszystkie pola adresowe!");

    const przycisk = document.getElementById('btn-finalizuj');
    przycisk.innerText = "Wysyłanie..."; przycisk.disabled = true;

    const klientDane = `${imie} | Tel: ${telefon} | Adres: ${adres}`;
    const produktyLista = koszyk.map(p => `${p.nazwa} (Ilość: ${p.ilosc}, Cena szt: ${p.cena} zł)`).join('\n');
    const wartoscCalkowita = koszyk.reduce((sum, item) => sum + (item.cena * item.ilosc), 0);
    const kodZamowienia = `ZAM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // UWAGA: Wysyłamy teraz także user_id!
    const daneDoWyslania = {
        user_id: aktualnyUzytkownik.id,
        klient_dane: klientDane,
        produkty_lista: produktyLista,
        wartosc_calkowita: wartoscCalkowita,
        status: 'Nowe',
        kod_zamowienia: kodZamowienia,
        metoda_platnosci: metoda
    };

    const { error } = await supabaseClient.from('zamowienia').insert([daneDoWyslania]);

    przycisk.innerText = "Złóż zamówienie (Bez płatności online)";
    przycisk.disabled = false;

    if (error) {
        alert(`Błąd z bazą: ${error.message}`);
    } else {
        alert(`Sukces! Twój kod zamówienia: ${kodZamowienia}`);
        koszyk = []; aktualizujWidokKoszyka();
        document.getElementById('zam-imie').value = '';
        document.getElementById('zam-telefon').value = '';
        document.getElementById('zam-adres').value = '';
        pobierzMojeZamowienia(); // Odśwież widok statusów
        zmienSekcje('status');
    }
}

// ---- POBIERANIE STATUSÓW ----

async function pobierzMojeZamowienia() {
    if(!aktualnyUzytkownik) return;
    const pojemnik = document.getElementById('lista-zamowien-klienta');
    
    // Szukamy w bazie zamówień należących tylko do zalogowanego ID
    const { data, error } = await supabaseClient
        .from('zamowienia')
        .select('*')
        .eq('user_id', aktualnyUzytkownik.id)
        .order('created_at', { ascending: false });

    if (error) {
        pojemnik.innerHTML = `<p style="color:red;">Błąd wczytywania: ${error.message}</p>`;
        return;
    }

    if(data.length === 0) {
        pojemnik.innerHTML = '<p style="color: #a8a8b3;">Nie złożyłeś jeszcze żadnych zamówień.</p>';
        return;
    }

    pojemnik.innerHTML = '';
    data.forEach(zam => {
        // Zabezpieczenie przed błędem, gdy ktoś usunie spacje w bazie
        const dataZalozenia = new Date(zam.created_at).toLocaleString('pl-PL');
        
        pojemnik.innerHTML += `
            <div class="zamowienie-karta">
                <div class="zamowienie-naglowek">
                    <span style="font-weight:bold; font-size: 1.1rem;">Nr: ${zam.kod_zamowienia}</span>
                    <span class="status-badge">${zam.status}</span>
                </div>
                <div style="color: #a8a8b3; font-size: 0.95rem; line-height: 1.6;">
                    <p style="margin: 5px 0;"><strong>Data zamówienia:</strong> ${dataZalozenia}</p>
                    <p style="margin: 5px 0;"><strong>Metoda płatności:</strong> ${zam.metoda_platnosci || 'Brak danych'}</p>
                    <p style="margin: 5px 0;"><strong>Suma:</strong> <span style="color:#00e676; font-weight:bold;">${zam.wartosc_calkowita} zł</span></p>
                    <hr style="border-color: #29292e; margin: 10px 0;">
                    <p style="margin: 5px 0; color:#fff;"><strong>Zamówione produkty:</strong></p>
                    <pre style="background-color: #121214; padding: 10px; border-radius: 6px; font-family: inherit; white-space: pre-wrap; font-size: 0.9rem;">${zam.produkty_lista}</pre>
                </div>
            </div>
        `;
    });
}

// ---- NAWIGACJA ----

function zmienSekcje(nazwaSekcji) {
    document.querySelectorAll('.sekcja').forEach(s => s.classList.remove('aktywna'));
    document.querySelectorAll('nav > button, .dropdown-btn').forEach(b => b.classList.remove('aktywny'));
    const docelowaSekcja = document.getElementById('sekcja-' + nazwaSekcji);
    
    if (nazwaSekcji !== 'szczegoly' && document.getElementById('btn-' + nazwaSekcji)) {
        document.getElementById('btn-' + nazwaSekcji).classList.add('aktywny');
    }
    if (docelowaSekcja) docelowaSekcja.classList.add('aktywna');
}

function wygenerujKategorieDropdown() {
    const dropdown = document.getElementById('lista-kategorii-dropdown');
    dropdown.innerHTML = ''; 
    const kategorie = [...new Set(wszystkieProdukty.map(item => item.kategoria))];
    kategorie.forEach(kat => {
        const btn = document.createElement('button');
        btn.innerText = kat || 'Inne';
        btn.onclick = () => {
            document.getElementById('naglowek-kategorii').innerText = 'Kategoria: ' + (kat || 'Inne');
            zmienSekcje('kategorie');
            wyswietlKatalog(wszystkieProdukty.filter(p => p.kategoria === kat), 'katalog-filtrowany');
        };
        dropdown.appendChild(btn);
    });
}

// Start aplikacji
pobierzCennik();
inicjalizacjaAuth();