#!/bin/bash
# icomers დოკუმენტაციის გაშვება: ორჯერ დააწკაპუნეთ ამ ფაილზე
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "❌ Node.js არ არის დაინსტალირებული."
  echo "   ჩამოტვირთეთ და დააინსტალირეთ: https://nodejs.org  (LTS ვერსია)"
  echo "   შემდეგ თავიდან გაუშვით ეს ფაილი."
  echo ""
  read -p "დააჭირეთ Enter-ს დასახურად..."
  exit 1
fi
echo "✅ დოკუმენტაცია ეშვება: http://localhost:8080"
echo "   გასათიშად დახურეთ ეს ფანჯარა (ან Ctrl+C)."
(sleep 1; open "http://localhost:8080") &
node docs-site/server.mjs
