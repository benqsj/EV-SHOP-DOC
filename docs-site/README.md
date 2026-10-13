# icomers — დოკუმენტაციის საიტი

## გახსნა
- **უბრალოდ სანახავად:** ორჯერ დააწკაპუნეთ `index.html`-ზე. სერვერი არ სჭირდება. ამ რეჟიმში პასუხები და დამატებები ინახება მხოლოდ იმ ბრაუზერში.
- **გუნდისთვის (ჰოსტინგი):** სერვერით პასუხები და დამატებები ერთ ადგილას ინახება და ყველასთვის ჩანს.

## როგორ არის აწყობილი
| ფაილი | რა არის |
|---|---|
| `../docs/*.md`, `../docs/diagrams/*.svg` | დოკუმენტაციის წყარო |
| `src/` | გვერდის შაბლონი, სტილი, JavaScript, marked |
| `build.mjs` | ყველაფერს ერთ ფაილად აწყობს: `../index.html` |
| `server.mjs` | ჰოსტინგისთვის: გვერდი + პასუხებისა და დამატებების API |
| `storage.mjs` | შენახვა: PostgreSQL (`DATABASE_URL`), ან ლოკალურად JSON ფაილი |
| `../Dockerfile` | image ჰოსტინგისთვის (რეპოს root-ში, usectl მას ავტომატურად იყენებს) |

დოკუმენტაციის შეცვლის შემდეგ: `node docs-site/build.mjs` (განაახლებს `index.html`-ს).

კითხვის დამატება markdown-ში:
```
:::question id="unique-id" to="ადრესატი"
კითხვის ტექსტი
:::
```

## ჰოსტინგი usectl-ზე

1. აპის რესურსები. საიტს ცოტა სჭირდება:
   ```
   usectl machines pods set <machine> ev-shop-doc storage=256Mi cpu=100m memory=128Mi
   ```
   აპის port: **8080**.
2. Postgres addon: დაამატეთ Machine-ზე და მიაბით აპს (`attach-addon … database`). აპი `DATABASE_URL`-ს ავტომატურად იღებს, და ცხრილებს (`docs_answers`, `docs_additions`) პირველ გაშვებაზე თავად ქმნის.
3. (სურვილისამებრ) პაროლი: `DOCS_BASIC_AUTH=user:password` (protected env).
4. Deploy: `usectl machines deploy <machine> ev-shop-doc`.

Health check: `GET /healthz`.

| ცვლადი | ნაგულისხმევი | აღწერა |
|---|---|---|
| `PORT` | `8080` | |
| `DATABASE_URL` | — | Postgres. თუ არ არის, პასუხები ინახება `DATA_DIR/answers.json`-ში (მხოლოდ ლოკალურად) |
| `DOCS_BASIC_AUTH` | — | `user:password`. თუ მითითებულია, საიტი პაროლით იხსნება |

ლოკალურად სერვერით: `npm install && npm start` → http://localhost:8080
