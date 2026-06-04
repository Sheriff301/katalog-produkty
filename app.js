// ---- KONFIGURACJA SUPABASE ----
const SUPABASE_URL = "https://prpycsgjzihsjmsqymyt.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHljc2dqemloc2ptc3F5bXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTY1NjcsImV4cCI6MjA5NTQ3MjU2N30.9E0hYR2RaYlzfiGGtMEp8pEmPvyG_ghWsXR3fNiusE0";

// ZMIANA: Używamy nazwy 'supabaseClient' zamiast 'supabase', aby uniknąć konfliktu z globalną zmienną biblioteki
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- STAN APLIKACJI (STATE) ----
let wszystkieProdukty = [];
let koszyk = [];
let aktualnyUzytkownik = null;
let obecnyTrybAuth = 'logowanie';

// ---- INICJALIZACJA WYGLĄDU (MOTYWU) ----
if (localStorage.getItem('motyw') === 'jasny') {
    document.body.classList.add('jasny-motyw');
}

// ---- ROZPOCZĘCIE DZIAŁANIA STRONY ----
document.addEventListener("DOMContentLoaded", async () => {
    await sprawdzUzytkownika();
    await pobierzProdukty();
    wczytajKoszykZLocalStorage();
});

// ---- ZMIANA MOTYWU (JASNY / CIEMNY) ----
function przelaczMotyw() {
    document.body.classList.toggle('jasny-motyw');
    const aktualnyMotyw = document.body.classList.contains('jasny-motyw') ? 'jasny' : 'ciemny';
    localStorage.setItem('motyw', aktualnyMotyw);
}

// ---- NAWIGACJA MIĘDZY SEKCJAMI ----
function zmienSekcje(nazwaSekcji) {
    document.querySelectorAll('.sekcja').forEach(s => s.classList.remove('aktywna'));
    const wybranaSekcja = document.getElementById(`sekcja-${nazwaSekcji}`);
    if (wybranaSekcja) wybranaSekcja.classList.add('aktywna');

    document.querySelectorAll('.nav-linki button').forEach(b => b.classList.remove('aktywny'));
    const aktywnyPrzycisk = document.getElementById(`btn-nav-${nazwaSekcji}`);
    if (aktywnyPrzycisk) aktywnyPrzycisk.classList.add('aktywny');
    
    if (nazwaSekcji === 'katalog') {
        document.getElementById('katalog-tytul').innerText = "Wszystkie Produkty";
        wyswietlProdukty(wszystkieProdukty);
    }
}

// ---- OBSŁUGA BAZY: PRODUKTY ----
async function pobierzProdukty() {
    try {
        const { data, error } = await supabaseClient.from('produkty').select('*');
        if (error) throw error;

        wszystkieProdukty = data || [];
        wyswietlProdukty(wszystkieProdukty);
        budujDropdownKategorii();
    } catch (err) {
        console.error("Błąd pobierania produktów (Sprawdź RLS w Supabase):", err.message);
    }
}

function wyswietlProdukty(lista) {
    const kontener = document.getElementById('produkty-lista-html');
    kontener.innerHTML = "";

    if (lista.length === 0) {
        kontener.innerHTML = "<p style='color: #a8a8b3;'>Brak produktów w bazie lub brak uprawnień odczytu.</p>";
        return;
    }

    lista.forEach(p => {
        const karta = document.createElement('div');
        karta.className = 'produkt-karta';
        
        // Dynamiczne dopasowanie przycisku w zależności od statusu zalogowania
        let przyciskAkcji = '';
        if (aktualnyUzytkownik) {
            // Zalogowany -> może normalnie kupować
            przyciskAkcji = `<button class="btn-akcja" onclick="dodajDoKoszyka(${p.id})">Dodaj do koszyka</button>`;
        } else {
            // Niezalogowany -> przycisk blokuje zakup i przekierowuje do logowania
            przyciskAkcji = `<button class="btn-akcja" style="background-color: #ff9800; color: #fff;" onclick="zmienSekcje('logowanie')">Zaloguj się, by dodać</button>`;
        }

        karta.innerHTML = `
            <div>
                <span class="kategoria">${p.kategoria || 'Ogólna'}</span>
                <h3>${p.nazwa}</h3>
            </div>
            <div>
                <div class="cena">${parseFloat(p.cena).toFixed(2)} zł</div>
                ${przyciskAkcji}
            </div>
        `;
        kontener.appendChild(karta);
    });
}

function budujDropdownKategorii() {
    const dropdown = document.getElementById('lista-kategorii-dropdown');
    dropdown.innerHTML = "";
    const kategorie = [...new Set(wszystkieProdukty.map(p => p.kategoria).filter(Boolean))];

    kategorie.forEach(kat => {
        const btn = document.createElement('button');
        btn.innerText = kat;
        btn.onclick = () => filtrujKategorie(kat);
        dropdown.appendChild(btn);
    });
}

function filtrujKategorie(nazwaKategorii) {
    zmienSekcje('katalog');
    document.getElementById('katalog-tytul').innerText = `Kategoria: ${nazwaKategorii}`;
    const przefiltrowane = wszystkieProdukty.filter(p => p.kategoria === nazwaKategorii);
    wyswietlProdukty(przefiltrowane);
}

// ---- LOGIKA KOSZYKA ----
function dodajDoKoszyka(idProduktu) {
    const produkt = wszystkieProdukty.find(p => p.id === idProduktu);
    if (!produkt) return;

    const istnieje = koszyk.find(item => item.id === idProduktu);
    if (istnieje) {
        istnieje.ilosc += 1;
    } else {
        koszyk.push({ ...produkt, ilosc: 1 });
    }

    zapiszKoszyk();
    aktualizujKoszykUI();
}

// ZMIANA ILOSCI W KOSZYKU
function zmienIlosc(idProduktu, zmiana) {
    const element = koszyk.find(item => item.id === idProduktu);
    if (!element) return;

    element.ilosc += zmiana;
    if (element.ilosc <= 0) {
        koszyk = koszyk.filter(item => item.id !== idProduktu);
    }

    zapiszKoszyk();
    aktualizujKoszykUI();
}

function usunZKoszyka(idProduktu) {
    koszyk = koszyk.filter(item => item.id !== idProduktu);
    zapiszKoszyk();
    aktualizujKoszykUI();
}

function aktualizujKoszykUI() {
    const listaHtml = document.getElementById('koszyk-elementy-lista');
    const licznikNav = document.getElementById('koszyk-licznik');
    const sekcjaPodsumowania = document.getElementById('koszyk-podsumowanie-sekcja');
    const sumaWartoscHtml = document.getElementById('koszyk-suma-wartosc');

    listaHtml.innerHTML = "";
    let lacznaIlosc = 0;
    let lacznaCena = 0;

    koszyk.forEach(item => {
        lacznaIlosc += item.ilosc;
        const kosztSuma = item.cena * item.ilosc;
        lacznaCena += kosztSuma;

        const el = document.createElement('div');
        el.className = 'koszyk-element';
        el.innerHTML = `
            <div>
                <h4>${item.nazwa}</h4>
                <p style="color: #a8a8b3; font-size: 0.9rem;">${parseFloat(item.cena).toFixed(2)} zł x ${item.ilosc} = ${kosztSuma.toFixed(2)} zł</p>
            </div>
            <div class="koszyk-kontrola">
                <button onclick="zmienIlosc(${item.id}, -1)">-</button>
                <span>${item.ilosc}</span>
                <button onclick="zmienIlosc(${item.id}, 1)">+</button>
                <button class="btn-usun" onclick="usunZKoszyka(${item.id})">Usuń</button>
            </div>
        `;
        listaHtml.appendChild(el);
    });

    licznikNav.innerText = lacznaIlosc;
    sumaWartoscHtml.innerText = lacznaCena.toFixed(2);

    if (koszyk.length > 0) {
        sekcjaPodsumowania.classList.remove('ukryty');
    } else {
        sekcjaPodsumowania.classList.add('ukryty');
        listaHtml.innerHTML = "<p style='color: #a8a8b3; text-align: center; margin-top: 20px;'>Twój koszyk jest pusty.</p>";
    }
}

function zapiszKoszyk() {
    localStorage.setItem('koszyk', JSON.stringify(koszyk));
}

function wczytajKoszykZLocalStorage() {
    const zapisany = localStorage.getItem('koszyk');
    if (zapisany) {
        koszyk = JSON.parse(zapisany);
        aktualizujKoszykUI();
    }
}

// ---- REALIZACJA ZAMÓWIENIA ----
async function zlozZamowienie(metodaPlatnosci) {
    const nazwa = document.getElementById('form-nazwa').value.trim();
    const telefon = document.getElementById('form-telefon').value.trim();
    const adres = document.getElementById('form-adres').value.trim();

    if (!nazwa || !telefon || !adres) {
        alert("Proszę uzupełnić wszystkie dane dostawy!");
        return;
    }

    const sumaWartosc = koszyk.reduce((sum, item) => sum + (item.cena * item.ilosc), 0);
    const kodZamowienia = "ZAM-" + Math.floor(100000 + Math.random() * 900000);
    
    const produktyOpis = koszyk.map(item => `${item.nazwa} (szt: ${item.ilosc})`).join(", ");
    const daneKlientaSkonsolidowane = `Klient: ${nazwa}, Tel: ${telefon}, Adres: ${adres}`;

    try {
        const { error } = await supabaseClient.from('zamowienia').insert([
            {
                klient_dane: daneKlientaSkonsolidowane,
                produkty_lista: produktyOpis,
                wartosc_calkowita: sumaWartosc,
                status: 'Nowe',
                kod_zamowienia: kodZamowienia,
                metoda_platnosci: metodaPlatnosci,
                user_id: aktualnyUzytkownik ? aktualnyUzytkownik.id : null
            }
        ]);

        if (error) throw error;

        alert(`Dziękujemy! Zamówienie ${kodZamowienia} zostało złożone pomyślnie.`);
        koszyk = [];
        zapiszKoszyk();
        aktualizujKoszykUI();
        
        document.getElementById('form-nazwa').value = "";
        document.getElementById('form-telefon').value = "";
        document.getElementById('form-adres').value = "";

        if (aktualnyUzytkownik) {
            pobierzMojeZamowienia();
            zmienSekcje('status');
        } else {
            zmienSekcje('katalog');
        }

    } catch (err) {
        alert("Błąd bazy danych przy składaniu zamówienia: " + err.message);
    }
}

// ---- HISTORIA ZAMÓWIEŃ ----
async function pobierzMojeZamowienia() {
    if (!aktualnyUzytkownik) return;

    try {
        const { data, error } = await supabaseClient
            .from('zamowienia')
            .select('*')
            .eq('user_id', aktualnyUzytkownik.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        wyswietlZamowienia(data || []);
    } catch (err) {
        console.error("Błąd pobierania zamówień:", err.message);
    }
}

function wyswietlZamowienia(lista) {
    const kontener = document.getElementById('zamowienia-lista-html');
    kontener.innerHTML = "";

    if (lista.length === 0) {
        kontener.innerHTML = "<p style='color: #a8a8b3;'>Nie złożyłeś jeszcze żadnych zamówień.</p>";
        return;
    }

    lista.forEach(z => {
        const dataFormat = new Date(z.created_at).toLocaleString('pl-PL');
        const karta = document.createElement('div');
        karta.className = 'zamowienie-karta';
        
        let klasaStatusu = 'status-nowe';
        if (z.status === 'W realizacji') klasaStatusu = 'status-realizacja';
        if (z.status === 'Wysłane' || z.status === 'Zakończone') klasaStatusu = 'status-wyslane';

        karta.innerHTML = `
            <div class="zamowienie-naglowek">
                <strong>Kod: ${z.kod_zamowienia}</strong>
                <span class="status-tag ${klasaStatusu}">${z.status || 'Nowe'}</span>
            </div>
            <p style="margin-bottom: 5px; font-size: 0.95rem;"><strong>Produkty:</strong> ${z.produkty_lista}</p>
            <p style="color: #a8a8b3; font-size: 0.85rem; margin-bottom: 8px;">Data: ${dataFormat} | Płatność: ${z.metoda_platnosci || 'Nieznana'}</p>
            <div style="text-align: right; font-weight: bold; color: #00e676;">Wartość: ${parseFloat(z.wartosc_calkowita).toFixed(2)} zł</div>
        `;
        kontener.appendChild(karta);
    });
}

// ---- SYSTEM AUTENTYKACJI (UŻYTKOWNICY) ----
function przelaczTrybAuth(e, tryb) {
    e.preventDefault();
    obecnyTrybAuth = tryb;
    const tytul = document.getElementById('logowanie-tytul-sekcji');
    const btn = document.getElementById('btn-glowny-auth');
    const przelacznik = document.getElementById('auth-przelacznik-tekst');

    if (tryb === 'rejestracja') {
        tytul.innerText = "Zarejestruj nowe konto";
        btn.innerText = "Zarejestruj się";
        przelacznik.innerHTML = `Masz już konto? <a href="#" style="color: #00e676; text-decoration: none;" onclick="przelaczTrybAuth(event, 'logowanie')">Zaloguj się</a>`;
    } else {
        tytul.innerText = "Zaloguj się do sklepu";
        btn.innerText = "Zaloguj się";
        przelacznik.innerHTML = `Nie masz konta? <a href="#" style="color: #00e676; text-decoration: none;" onclick="przelaczTrybAuth(event, 'rejestracja')">Zarejestruj się</a>`;
    }
}

async function autentykuj() {
    const email = document.getElementById('auth-email').value.trim();
    const haslo = document.getElementById('auth-haslo').value;

    if (!email || !haslo) {
        alert("Wypełnij adres e-mail oraz hasło!");
        return;
    }

    if (obecnyTrybAuth === 'rejestracja') {
        const { data, error } = await supabaseClient.auth.signUp({ email, password: haslo });
        if (error) {
            alert("Błąd rejestracji: " + error.message);
        } else {
            alert("Konto utworzone! Jeśli włączona jest weryfikacja, sprawdź skrzynkę e-mail.");
            aktualizujInterfejsUzytkownika(data.user);
        }
    } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: haslo });
        if (error) {
            alert("Błąd logowania: " + error.message);
        } else {
            aktualizujInterfejsUzytkownika(data.user);
        }
    }
}

async function wylogujKlienta() {
    await supabaseClient.auth.signOut();
    aktualizujInterfejsUzytkownika(null);
    zmienSekcje('katalog');
}

async function sprawdzUzytkownika() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    aktualizujInterfejsUzytkownika(user);
}

// INTERFEJS ZALEŻNY OD LOGOWANIA
function aktualizujInterfejsUzytkownika(user) {
    aktualnyUzytkownik = user;
    const btnKonto = document.getElementById('btn-konto');
    const btnWyloguj = document.getElementById('btn-wyloguj');
    const btnStatus = document.getElementById('btn-status');
    const btnUstawienia = document.getElementById('btn-ustawienia');
    const infoLogowanie = document.getElementById('wymagane-logowanie-info');
    const formDanych = document.getElementById('formularz-danych');
    const ustawieniaEmail = document.getElementById('ustawienia-email-tekst');

    // ZMIANA: Po zalogowaniu/wylogowaniu natychmiast przebudowujemy widok produktów, aby zmienić przyciski
    if (wszystkieProdukty.length > 0) {
        wyswietlProdukty(wszystkieProdukty);
    }

    if (user) {
        btnKonto.classList.add('ukryty');
        btnWyloguj.classList.remove('ukryty');
        btnStatus.classList.remove('ukryty');
        btnUstawienia.classList.remove('ukryty');
        infoLogowanie.classList.add('ukryty');
        formDanych.classList.remove('ukryty');
        ustawieniaEmail.innerText = user.email;
        
        pobierzMojeZamowienia();
        if (document.getElementById('sekcja-logowanie').classList.contains('aktywna')) {
            zmienSekcje('katalog');
        }
    } else {
        btnKonto.classList.remove('ukryty');
        btnWyloguj.classList.add('ukryty');
        btnStatus.classList.add('ukryty');
        btnUstawienia.classList.add('ukryty');
        infoLogowanie.classList.remove('ukryty');
        formDanych.classList.add('ukryty');
        ustawieniaEmail.innerText = "Brak danych";
    }
}