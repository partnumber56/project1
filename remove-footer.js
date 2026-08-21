import fs from 'fs';

let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

const strToRemove = `          {/* Bottom Footer */}
          <div className="mt-8 pt-4 border-t font-medium border-slate-100 italic text-xs text-slate-400 text-center flex flex-col gap-2">
            <div className="flex justify-around mb-4 italic text-sm text-slate-900">
              <div className="border-b border-slate-900 w-48 text-center pb-2 uppercase tracking-tighter font-black">Підпис продавця</div>
              <div className="border-b border-slate-900 w-48 text-center pb-2 uppercase tracking-tighter font-black">Підпис покупця</div>
            </div>
            <p>Система PartNumber — професійний облік автозапчастин та сто сто. Дякуємо, що ви з нами!</p>
          </div>`;

if (content.includes(strToRemove)) {
    content = content.replace(strToRemove, '');
    fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
    console.log("Successfully removed footer");
} else {
    console.log("Footer string not found!");
}
