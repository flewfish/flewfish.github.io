# 鎴戠殑鍗氬

鍩轰簬 [Hexo](https://hexo.io/) + [Butterfly 涓婚](https://github.com/jerryc127/hexo-theme-butterfly)锛?鐢?**GitHub Actions 鑷姩鏋勫缓骞堕儴缃?*鍒?GitHub Pages銆?
绾夸笂鍦板潃锛歨ttps://flewfish.github.io/

---

## 瀹冩槸鎬庝箞宸ヤ綔鐨?
```
浣犲啓 Markdown  鈫? git push 鍒?main  鈫? GitHub Actions 鑷姩 npm ci + hexo g  鈫? 鍙戝竷鍒?GitHub Pages
```

**浣犵殑鐢佃剳鍙槸銆屽啓浣滃伐鍏枫€嶏紝涓嶆槸鏈嶅姟鍣ㄣ€?* 鐢佃剳鍏虫満銆佹崯鍧忋€佹崲鏂版満锛岄兘涓嶅奖鍝嶅埆浜鸿闂崥瀹€?鎵€鏈夋簮鐮侊紙Markdown 鍘熸枃 + 閰嶇疆 + 涓婚锛夐兘瀛樺湪 GitHub 涓婏紝鎹换浣曡澶?clone 涓嬫潵灏辫兘鎺ョ潃鍐欍€?
---

## 涓€銆佹棩甯革細鍙戜竴绡囨柊鏂囩珷

### 鏂瑰紡 A锛氭湰鍦板啓锛堟帹鑽愶級

```powershell
cd D:\涓汉鍗氬

# 1. 鏂板缓鏂囩珷
npx hexo new "鏂囩珷鏍囬"

# 2. 缂栬緫 source/_posts/鏂囩珷鏍囬.md
#    锛圡arkdown 璇硶 + 寮€澶寸殑 Front Matter锛?
# 3. 鏈湴棰勮锛堝彲閫夛紝Ctrl+C 鍋滄锛?npx hexo server      # 娴忚鍣ㄦ墦寮€ http://localhost:4000

# 4. 鍙戝竷
git add -A
git commit -m "鏂板鏂囩珷锛氭枃绔犳爣棰?
git push
```

鎺ㄩ€佸悗绾?**1 鍒嗛挓**鑷姩涓婄嚎銆?
### 鏂瑰紡 B锛氭墜鏈轰笂鍐?
1. 鎵嬫満娴忚鍣ㄦ墦寮€  
   `https://github.com/flewfish/flewfish.github.io/tree/main/source/_posts`
2. 鐐?**Add file 鈫?Create new file**
3. 鏂囦欢鍚嶅～ `鎴戠殑鏂囩珷.md`
4. 鍐呭鎸変笅闈㈢殑鏍煎紡鍐?5. 鐐?**Commit changes**

**鎵嬫満涔熻兘鍙戞枃绔狅紝瀹屽叏涓嶄緷璧栫數鑴戙€?*

---

## 浜屻€佹枃绔犵殑 Front Matter 鏍煎紡

```yaml
---
title: 鏂囩珷鏍囬
date: 2026-10-16 20:00:00
tags:
  - 闅忕瑪
categories:
  - 鐢熸椿
cover: /img/灏侀潰.jpg          # 鍙€夛細鏂囩珷灏侀潰
description: 涓€鍙ヨ瘽鎽樿        # 鍙€夛細棣栭〉鏄剧ず鐨勬憳瑕?swiper_index: 1              # 鍙€夛細鏁板瓧瓒婂ぇ瓒婇潬鍓嶏紝鍑虹幇鍦ㄩ椤佃疆鎾浘
---
杩欓噷寮€濮嬪啓姝ｆ枃锛岀敤 Markdown 璇硶鈥︹€?
## 浜岀骇鏍囬

- 鍒楄〃椤?- **鍔犵矖**銆乣浠ｇ爜`銆乕閾炬帴](https://example.com)
```

> **棣栭〉杞挱鍥?*鐢?`hexo-butterfly-swiper` 鎻掍欢椹卞姩銆?> 鍙湁 Front Matter 閲屽啓浜?`swiper_index` 鐨勬枃绔犳墠浼氳繘杞挱锛屽苟涓旈渶瑕侀厤 `cover` 灏侀潰鍥俱€?
---

## 涓夈€佹湰鍦板父鐢ㄥ懡浠?
| 鍛戒护 | 浣滅敤 |
|---|---|
| `npx hexo new "鏍囬"` | 鏂板缓涓€绡囨枃绔?|
| `npx hexo new page "鍚嶅瓧"` | 鏂板缓涓€涓嫭绔嬮〉闈?|
| `npx hexo server` | 鏈湴棰勮 鈫?http://localhost:4000 |
| `npx hexo clean` | 娓呯悊缂撳瓨鍜?`public/` |
| `npx hexo generate` | 鐢熸垚闈欐€佹枃浠跺埌 `public/` |
| `npm install` | 棣栨 clone 鍚庡畨瑁呬緷璧?|

> 鈿狅笍 **浣犱笉闇€瑕佹墽琛?`hexo deploy`銆?* 閮ㄧ讲瀹屽叏浜ょ粰 GitHub Actions銆?
---

## 鍥涖€佹敼缃戠珯淇℃伅

| 鎯虫敼浠€涔?| 鏀瑰摢涓枃浠?|
|---|---|
| 绔欑偣鏍囬銆佸壇鏍囬銆佷綔鑰呫€佽瑷€銆佺綉鍧€銆佹枃绔犳暟 | `_config.yml` |
| 瀵艰埅鑿滃崟銆佸ご鍍忋€佹í骞呭浘銆佺ぞ浜ら摼鎺ャ€佹殫鑹叉ā寮忋€佹悳绱€侀〉鑴?| `_config.butterfly.yml` |
| 鏂囩珷鍐呭 | `source/_posts/*.md` |
| 鍏充簬椤?| `source/about/index.md` |
| 鐣欒█鏉?| `source/comments/index.md` |
| 棣栭〉杞挱寮€鍏充笌鏍峰紡 | `_config.butterfly.yml` 鏈熬鐨?`swiper:` 娈?|

> `_config.butterfly.yml` 浼?*瑕嗙洊** `themes/butterfly/_config.yml`锛屾墍浠ヤ綘鍙敼鍓嶈€呭嵆鍙紝
> 杩欐牱灏嗘潵鏇存柊涓婚涓嶄細鍐叉帀浣犵殑閰嶇疆銆?
### 鎹㈠ご鍍?/ 妯箙鍥?
1. 鎶婂浘鐗囨斁杩?`source/img/`锛堟病鏈夊氨鏂板缓杩欎釜鐩綍锛?2. 鍦?`_config.butterfly.yml` 閲屽紩鐢紝渚嬪锛?   ```yaml
   avatar:
     img: /img/avatar.png
   index_img: /img/banner.jpg
   ```

---

## 浜斻€佲殸锔?宸茬粡濉ソ鐨勫潙锛岃涓嶈闅忔剰鏀瑰姩

| 椤?| 璁惧畾 | 涓轰粈涔?|
|---|---|---|
| `hexo` | `^7.3.0` | Hexo 8 渚濊禆 `strip-ansi@^7`锛堢函 ESM锛夛紝闇€瑕?Node 鈮?20.19 鎵嶈兘 `require()`銆傛湰鏈?Node 鏄?**20.12.2**锛屽崌鍒?Hexo 8 浼氱洿鎺ュ穿 |
| 绗笁鏂?CDN | `fastly.jsdelivr.net` | 鍥藉唴 **`cdn.jsdelivr.net` 宸茶澧?*锛堝疄娴嬭繛鎺ヨ秴鏃讹級銆俙fastly` 鏄悓涓€浠藉唴瀹圭殑瀹樻柟澶囩敤鑺傜偣锛屽悓鏍锋敮鎸佽嚜鍔ㄥ帇缂┿€?*涓嶈鏀瑰洖 jsdelivr**锛屽惁鍒欏浘鏍囧拰鐗规晥浼氬叏鎸?|
| 鏈湴鎼滅储 | `hexo-generator-searchdb` | Butterfly 鐨?`local_search` 渚濊禆瀹冪敓鎴?`search.xml` 绱㈠紩锛涚己浜嗕細鐩存帴鏋勫缓鎶ラ敊 `Cannot read properties of undefined (reading 'path')` |

鏀瑰畬涓婚鎴栦緷璧栧悗锛?*鍏堟湰鍦拌窇涓€娆?* `npx hexo generate` 纭娌℃姤閿欏啀鎺ㄩ€併€?
---

## 鍏€侀儴缃?
- 鎺ㄩ€佸埌 `main` 鍒嗘敮 鈫?鑷姩閮ㄧ讲
- 涔熷彲鍦ㄤ粨搴?**Actions** 椤甸潰鐐?**Run workflow** 鎵嬪姩瑙﹀彂
- 閮ㄧ讲閰嶇疆锛歚.github/workflows/deploy.yml`
- 鏋勫缓鏃ュ織锛歨ttps://github.com/flewfish/flewfish.github.io/actions

---

## 涓冦€佸凡閰嶇疆鐨勫寮哄姛鑳?
| 鍔熻兘 | 瀹炵幇 | 浣嶇疆 |
|---|---|---|
| **璇勮绯荤粺** | [giscus](https://giscus.app/zh-CN)锛岃瘎璁哄瓨鍦ㄦ湰浠撳簱鐨?Discussions 閲岋紙鍒嗙被 `General`锛夛紝璁垮鐢?GitHub 璐﹀彿鐧诲綍 | `_config.butterfly.yml` 鐨?`giscus:` 娈?|
| **live2d 鐪嬫澘濞?* | `live2d-widgets@1`锛圡IT锛?| `inject.bottom` |
| **妯辫姳椋樿惤** | `sakura-js 1.1.1`锛圡IT锛夛紝**宸茶嚜鎵樼** | `source/js/sakura.min.js` |
| **鍏夋爣鎷栧熬** | 鑷疄鐜?canvas 绮掑瓙锛岃Е灞?鍑忓皯鍔ㄦ晥涓嬭嚜鍔ㄧ鐢?| `source/js/cursor-trail.js` |
| **棣栭〉杞挱鍥?* | `hexo-butterfly-swiper` | `_config.butterfly.yml` 鏈熬 `swiper:` 娈?|

> 妯辫姳涓庡厜鏍囨槸**鑷墭绠?*鐨勶紝涓嶄緷璧栫涓夋柟 CDN銆?> live2d 鍥犳ā鍨嬫枃浠惰繃澶ф棤娉曡嚜鎵樼锛岃蛋 `fastly.jsdelivr.net`銆?
## 鍏€佽繕娌″仛鐨勶紙鎯宠鐨勮瘽鍐嶈锛?
- [ ] **鑷畾涔夊煙鍚?*锛堝彲閫夛紝绾?50鈥?0 鍏?骞达紝**涓嶆槸鏈嶅姟鍣?*锛?- [ ] **鏂囩珷灏侀潰鍥?*锛氶椤佃疆鎾浘闇€瑕佹瘡绡囨枃绔犲湪 front-matter 閲岄厤 `cover`

---

## 鍏€佸湪鏂扮數鑴戜笂鎭㈠

```powershell
git clone git@github.com:flewfish/flewfish.github.io.git
cd flewfish.github.io
npm install
npx hexo server
```

灏辫繖浜?鈥斺€?鐜瑁呭ソ锛圙it + Node.js锛夊悗锛屼竴鏉?clone 灏卞畬鏁村鍘熴€?