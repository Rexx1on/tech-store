"use strict";

const USD_TO_TRY = 34;
const FREE_SHIPPING_THRESHOLD = 1000;
const SHIPPING_FEE = 50;
const COUPON_CODE = "MESLEK11";
const COUPON_RATE = 0.20;

let sepet = sepetiYukle();
let vitrinUrunleri = [];
let kuponAktif = false;

function sepetiYukle() {
    try {
        const kayitliSepet = JSON.parse(localStorage.getItem("sepetim") || "[]");
        return Array.isArray(kayitliSepet) ? kayitliSepet.filter(urun => urun && Number.isFinite(Number(urun.price))) : [];
    } catch {
        return [];
    }
}

function tlFiyat(dolar) {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(dolar) * USD_TO_TRY);
}

function sepetiKaydet() {
    localStorage.setItem("sepetim", JSON.stringify(sepet));
}

function sepetSayaciniGuncelle() {
    const sayac = document.getElementById("sepetSayaci");
    if (sayac) sayac.textContent = String(sepet.length);
}

function hataMesajiniGoster(container, mesaj) {
    container.innerHTML = "";
    const durum = document.createElement("p");
    durum.className = "state-message error";
    durum.textContent = mesaj;
    container.append(durum);
}

async function urunleriGetir(kategori) {
    const vitrin = document.getElementById("urun-vitrini");
    if (!vitrin) return;

    vitrin.replaceChildren();
    const yukleniyor = document.createElement("p");
    yukleniyor.className = "state-message";
    yukleniyor.textContent = "Ürünler yükleniyor…";
    vitrin.append(yukleniyor);

    try {
        const cevap = await fetch(`https://dummyjson.com/products/category/${encodeURIComponent(kategori)}`);
        if (!cevap.ok) throw new Error("Ürün sunucusuna ulaşılamadı.");
        const veri = await cevap.json();
        vitrinUrunleri = Array.isArray(veri.products) ? veri.products : [];
        vitrineBas(vitrinUrunleri);
    } catch {
        vitrinUrunleri = [];
        hataMesajiniGoster(vitrin, "Ürünler şu anda yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.");
    }
}

function vitrineBas(urunler) {
    const vitrin = document.getElementById("urun-vitrini");
    if (!vitrin) return;
    vitrin.replaceChildren();

    if (!urunler.length) {
        const durum = document.createElement("p");
        durum.className = "state-message";
        durum.textContent = "Bu kategoride şu anda ürün bulunmuyor.";
        vitrin.append(durum);
        return;
    }

    const fragment = document.createDocumentFragment();
    urunler.forEach(urun => {
        const kart = document.createElement("article");
        kart.className = "urun-karti";

        const detay = document.createElement("div");
        const imageWrap = document.createElement("div");
        imageWrap.className = "product-image-wrap";
        const image = document.createElement("img");
        image.src = urun.thumbnail || "";
        image.alt = urun.title ? `${urun.title} ürün görseli` : "Ürün görseli";
        image.loading = "lazy";
        imageWrap.append(image);
        detay.append(imageWrap);

        const category = document.createElement("p");
        category.className = "product-category";
        category.textContent = (urun.category || "TechStore").replaceAll("-", " ");
        const title = document.createElement("h3");
        title.textContent = urun.title || "İsimsiz ürün";
        const meta = document.createElement("div");
        meta.className = "product-meta";
        const rating = document.createElement("span");
        rating.textContent = `★ ${Number(urun.rating || 0).toFixed(1)} puan`;
        const stock = document.createElement("span");
        stock.textContent = `Stok: ${urun.stock ?? 0}`;
        meta.append(rating, stock);
        detay.append(category, title, meta);

        const bottom = document.createElement("div");
        bottom.className = "product-bottom";
        const price = document.createElement("span");
        price.className = "urun-fiyat";
        price.textContent = tlFiyat(urun.price);
        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "ekle-btn";
        addButton.textContent = "Sepete ekle +";
        addButton.addEventListener("click", () => sepeteEkle(urun.id));
        bottom.append(price, addButton);

        kart.append(detay, bottom);
        fragment.append(kart);
    });
    vitrin.append(fragment);
}

function sepeteEkle(urunId) {
    const eklenecekUrun = vitrinUrunleri.find(urun => urun.id === urunId);
    if (!eklenecekUrun) return;
    sepet.push(eklenecekUrun);
    sepetiKaydet();
    sepetSayaciniGuncelle();

    const ses = document.getElementById("sepetSesi");
    if (ses) {
        ses.currentTime = 0;
        ses.play().catch(() => {});
    }
}

function toplamOzetiniGuncelle(araToplam) {
    const kargo = araToplam === 0 || araToplam >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const indirim = kuponAktif && araToplam > 0 ? araToplam * COUPON_RATE : 0;
    const genelToplam = Math.max(0, araToplam + kargo - indirim);
    const araToplamAlani = document.getElementById("araToplamAlani");
    const kargoAlani = document.getElementById("kargoAlani");
    const indirimSatiri = document.getElementById("indirimSatiri");
    const indirimAlani = document.getElementById("indirimAlani");
    const toplamAlani = document.getElementById("toplamTutarAlani");

    if (araToplamAlani) araToplamAlani.textContent = tlFiyat(araToplam);
    if (kargoAlani) kargoAlani.textContent = kargo === 0 ? "Ücretsiz" : tlFiyat(kargo);
    if (indirimSatiri) indirimSatiri.hidden = indirim === 0;
    if (indirimAlani) indirimAlani.textContent = `−${tlFiyat(indirim)}`;
    if (toplamAlani) toplamAlani.textContent = tlFiyat(genelToplam);
    return genelToplam;
}

function sepetTablosunuCiz() {
    const govde = document.getElementById("sepetTabloGovdesi");
    if (!govde) return;
    govde.replaceChildren();

    let araToplam = 0;
    if (sepet.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.className = "empty-cell";
        cell.textContent = "Sepetiniz boş. Ürünleri keşfetmek için mağazaya dönebilirsiniz.";
        row.append(cell);
        govde.append(row);
    } else {
        const fragment = document.createDocumentFragment();
        sepet.forEach((urun, index) => {
            const fiyat = Number(urun.price) * USD_TO_TRY;
            araToplam += fiyat;
            const row = document.createElement("tr");
            const imageCell = document.createElement("td");
            const image = document.createElement("img");
            image.className = "cart-product-image";
            image.src = urun.thumbnail || "";
            image.alt = urun.title ? `${urun.title} ürün görseli` : "Ürün görseli";
            image.loading = "lazy";
            imageCell.append(image);

            const titleCell = document.createElement("td");
            titleCell.className = "product-name-cell";
            titleCell.textContent = urun.title || "İsimsiz ürün";
            const brandCell = document.createElement("td");
            brandCell.className = "product-brand";
            brandCell.textContent = urun.brand || "—";
            const priceCell = document.createElement("td");
            priceCell.className = "product-price";
            priceCell.textContent = tlFiyat(urun.price);
            const actionCell = document.createElement("td");
            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "urun-sil-btn";
            removeButton.textContent = "Sil";
            removeButton.setAttribute("aria-label", `${urun.title || "Ürün"} ürününü sepetten sil`);
            removeButton.addEventListener("click", () => sepettenSil(index));
            actionCell.append(removeButton);
            row.append(imageCell, titleCell, brandCell, priceCell, actionCell);
            fragment.append(row);
        });
        govde.append(fragment);
    }

    toplamOzetiniGuncelle(araToplam);
    sepetSayaciniGuncelle();
}

function kuponUygula() {
    const input = document.getElementById("kuponKodu");
    const mesaj = document.getElementById("kuponMesaji");
    if (!input || !mesaj) return;

    mesaj.className = "coupon-message";
    if (sepet.length === 0) {
        kuponAktif = false;
        mesaj.textContent = "Kupon kullanmak için sepetinize ürün ekleyin.";
        mesaj.classList.add("error");
    } else if (input.value.trim().toUpperCase() === COUPON_CODE) {
        kuponAktif = true;
        mesaj.textContent = "MESLEK11 kuponu uygulandı: %20 indirim.";
        mesaj.classList.add("success");
    } else {
        kuponAktif = false;
        mesaj.textContent = "Kupon kodu geçersiz. Tekrar deneyin.";
        mesaj.classList.add("error");
    }
    sepetTablosunuCiz();
}

function sepettenSil(index) {
    sepet.splice(index, 1);
    sepetiKaydet();
    if (sepet.length === 0) kuponAktif = false;
    sepetTablosunuCiz();
}

function sepetiBosalt() {
    sepet = [];
    kuponAktif = false;
    localStorage.removeItem("sepetim");
    const input = document.getElementById("kuponKodu");
    const mesaj = document.getElementById("kuponMesaji");
    if (input) input.value = "";
    if (mesaj) {
        mesaj.textContent = "";
        mesaj.className = "coupon-message";
    }
    sepetTablosunuCiz();
}

function siparisiTamamla(olay) {
    olay.preventDefault();
    if (sepet.length === 0) {
        alert("Sepetiniz boş. Sipariş vermeden önce ürün ekleyin.");
        return;
    }

    const musteri = document.getElementById("musteriAd").value.trim();
    const toplam = document.getElementById("toplamTutarAlani").textContent;
    alert(`Teşekkürler ${musteri}! Demo siparişiniz alındı. Toplam: ${toplam}.\nBu uygulama gerçek ödeme almaz.`);
    sepetiBosalt();
    olay.currentTarget.reset();
    window.location.href = "index.html";
}

sepetSayaciniGuncelle();
urunleriGetir("laptops");
sepetTablosunuCiz();
