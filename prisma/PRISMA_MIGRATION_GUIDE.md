# 🏛️ Prisma & Turso Migration Guide (Shop Health SaaS)

Bhai, ye document aapke database ka "Geeta" hai. Jab bhi database me koi naya column ya table add karna ho, to HAMESHA ye rules aur steps follow karne hain taaki kabhi crash ya `URL_INVALID` ya `no such column` wala error na aaye.

---

## 🧠 1. Concept: Prisma aur Shadow DB kaise kaam karte hain?

**Analogy:** Ek architect (Prisma) ek building (Database) bana raha hai.
- **schema.prisma:** Ye aapka *Blueprint* (Naksha) hai.
- **Local DB (`dev.sqlite`):** Ye aapka *Test Plot* hai jahan architect nakshe ko test karta hai.
- **Shadow DB:** Ye ek chupa hua temporary plot hai. Jab architect blueprint me changes karta hai, to wo ek khali Shadow DB banata hai, usme naya naksha lagata hai, aur check karta hai ki purane aur naye nakshe me kya difference hai. Us difference ko wo ek `.sql` file (Migration) me likh deta hai.
- **Live DB (Turso):** Ye aapki *Real Building* hai jahan log (users) reh rahe hain.

### Turso ki sabse badi catch (Dhyan rakhne wali baat)
Prisma CLI (Commands) directly `libsql://` (Turso) URLs par migration chalane me nakhre karta hai. Isliye best aur sabse professional tareeqa ye hota hai ki hum **Local DB** ke through `.sql` (migration) file generate karein, aur fir us file ko apne aap manually **Live Turso DB** par push kar dein.

---

## 🛠️ 2. The Golden Workflow (Step-by-Step Guide)

Jab bhi aap `schema.prisma` me koi naya `model` ya `column` add/remove karo, to EXACTLY in steps ko follow karna:

### Step 1: Migration SQL generate karo (Local test)
Apne terminal me chalao:
```bash
npx prisma migrate dev --name <kuch_bhi_naam_jaise_add_billing>
```
**Ye kya karega?** 
1. Aapke `schema.prisma` ko padhega.
2. `prisma/migrations/` folder me ek naya folder banayega (jisme `migration.sql` hogi).
3. Aapke local `dev.sqlite` ko update kar dega.

### Step 2: Nayi Migration ko Turso (Live DB) par push karo
Kyunki migration file ban chuki hai, ab humein ise real database par apply karna hai taaki error na aaye. Turso CLI ka use karke isko apply karo:
```bash
turso db shell shopify-learning-arjun-gurjar < ./prisma/migrations/<YOUR_LATEST_MIGRATION_FOLDER_NAME>/migration.sql
```
*(Tip: `<YOUR_LATEST_MIGRATION_FOLDER_NAME>` ki jagah wo folder name daalna jo Step 1 me generate hua tha)*

**Agar aapke paas Turso CLI nahi hai, to alternative script:**
Aap ek choti si Node script (`migrate.mjs`) bana kar bhi us SQL command ko execute kar sakte ho (jaise maine pichle error me fix karne ke liye kiya tha).

### Step 3: Prisma Client ko update karo
Aapne database to update kar diya, par aapke code (TypeScript) ko bhi to pata chalna chahiye ki naye columns aa gaye hain.
```bash
npx prisma generate
```
**Ye kya karega?**
`node_modules/@prisma/client` ko update karega taaki VSCode me autocompletion aane lag jaye.

---

## 🚨 3. Warning (Kabhi Mat Karna)
- **Kabhi bhi `schema.prisma` me changes karke direct `npm run dev` mat chalana** bina uper wale steps kiye. Varna code naye columns maangega jo live DB me honge hi nahi, aur app crash ho jayegi.
- **Prisma adapter initialization (`db.server.ts`):** `PrismaLibSql` ko directly object chahiye hota hai. Ise galti se bhi `createClient` ke andar wrap mat karna varna `URL_INVALID` error aayega. (Ye issue ab hamesha ke liye fixed hai).
