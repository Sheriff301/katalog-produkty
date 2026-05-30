const supabaseUrl = 'https://prpycsgjzihsjmsqymyt.supabase.co'; 
const supabaseKey = 'TUTAJ_WKLEJ_SWÓJ_KLUCZ_SB_PUBLISHABLE'; 

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let wszystkieProdukty = [];
let koszyk = JSON.parse(localStorage.getItem('koszyk')) || [];

async function pobierzCennik() {
    const { data, error } = await supabaseClient.from('produkty').select('*');
    if (error) { console.error(error); return; }
    
    // DEBUG: Wyświetlamy cały pierwszy produkt, żebyś zobaczył nazwę pola ID
    if (data.length > 0) console.log("Struktura przykładowego produktu:", data[0]);
    
    wszystkieProdukty = data;
    wyswietlKatalog();
}

function wyswietlKatalog() {
    const pojemnik = document.getElementById('katalog-pojemnik');
    pojemnik.innerHTML = '';

    wszystkieProdukty.forEach(przedmiot => {
        // UWAGA: Jeśli 'przedmiot.id' jest undefined, sprawdź konsolę po nazwie pola, którą wyświetliłem wyżej!
        const idProduktu = przedmiot.id; 
        
        const karta = document.createElement('div');
        karta.className = 'produkt-karta';
        karta.innerHTML = `
            <h3>${przedmiot.nazwa}</h3>
            <p>${przedmiot.cena} zł</p>
            <button class="btn-akcja" onclick="dodajDoKoszyka('${idProduktu}')">Dodaj</button>
        `;
        pojemnik.appendChild(karta);
    });
}

function dodajDoKoszyka(id) {
    console.log("Próba dodania ID:", id); // Sprawdź co się tu wyświetla
    if(id === "undefined") {
        alert("Błąd: ID produktu jest nieznane. Sprawdź konsolę (F12)!");
        return;
    }
    
    const produkt = wszystkieProdukty.find(p => String(p.id) === String(id));
    if (produkt) {
        koszyk.push({ ...produkt, ilosc: 1 });
        localStorage.setItem('koszyk', JSON.stringify(koszyk));
        alert("Dodano!");
    }
}

async function wyslijZamowienie(event) {
    event.preventDefault();
    const { data, error } = await supabaseClient.from('zamowienia').insert([{
        klient_dane: document.getElementById('klient-nazwa').value,
        produkty_lista: JSON.stringify(koszyk),
        status: 'Nowe',
        kod_zamowienia: Math.random().toString(36).substring(7).toUpperCase()
    }]);
    if (error) alert("Błąd: " + error.message);
    else alert("Zamówienie wysłane!");
}

async function sprawdzStatusZamowienia() {
    const kod = document.getElementById('input-kod-zamowienia').value;
    const { data, error } = await supabaseClient.from('zamowienia').select('*').eq('kod_zamowienia', kod);
    if (error || data.length === 0) alert("Nie znaleziono");
    else alert("Status: " + data[0].status);
}

function zmienSekcje(nazwa) {
    document.querySelectorAll('.sekcja').forEach(s => s.classList.remove('aktywna'));
    document.getElementById('sekcja-' + nazwa).classList.add('aktywna');
}

pobierzCennik();