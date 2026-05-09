# Dino Qaçış

Google Chrome-un məşhur oflayn dinozavr oyununun cilalanmış, mobil və masaüstü cihazlar üçün tam uyğunlaşdırılmış versiyasıdır. Yalnız saf HTML, CSS və JavaScript ilə hazırlanıb — heç bir kitabxanaya, build addımına və ya quraşdırmaya ehtiyac yoxdur. Faylı açın və oynayın.

## Canlı demo

GitHub Pages üzərində oynamaq üçün repozitorinin **Pages** bölməsindən aktivləşdirildikdən sonra link bu hissədə yerləşəcək.

## İdarəetmə

| Hərəkət | Masaüstü | Mobil |
| --- | --- | --- |
| Tullanmaq | `Space` / `↑` / Klik | Ekrana toxunma və ya **▲** düyməsi |
| Əyilmək | `↓` (basılı saxla) | Aşağı sürüşdür və ya **▼** düyməsi |
| Fasilə | `P` | Aşağıdakı **Fasilə** düyməsi |
| Yenidən başlamaq | `Enter` / `R` | Ekrana toxunma və ya **Yenidən başla** düyməsi |

## Xüsusiyyətlər

- 60 FPS canvas rendering və sabit zaman addımlı (fixed-timestep) fizika
- Hər 300 xaldan sonra gündüz ↔ gecə dövrü
- Müxtəlif ölçülü kaktuslar və üç fərqli hündürlükdə uçan pteranadon
- `localStorage` vasitəsilə yadda saxlanan rekord
- Web Audio API ilə sintezləşdirilmiş tullanma, xal və zərbə səsləri (ayrıca audio fayl yoxdur)
- Tam responsiv dizayn: 320 piksellik portret telefondan başlayaraq geniş masaüstü ekranlara qədər
- Səhifə fonda olduqda oyun avtomatik dayanır
- Sistem rejiminə uyğun olaraq tünd və açıq tema
- `prefers-reduced-motion` parametrinə hörmət edir

## Lokal işə salmaq

Bu, statik bir saytdır. İstənilən statik server uyğundur:

```bash
npx serve .
# və ya
python -m http.server 8000
```

Daha sonra brauzerdə `http://localhost:8000` ünvanını açın.

## Layihə strukturu

```
.
├── index.html   # HTML, HUD, overlay, toxunma paneli
├── styles.css   # responsiv layout, açıq və tünd tema
├── game.js      # oyun döngüsü, fizika, rəsm, idarəetmə
└── README.md
```

## Lisenziya

MIT
