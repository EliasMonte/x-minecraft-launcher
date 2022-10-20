import { squeeze, infuse } from 'vue-i18n-locale-message'
import { writeFile, readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { stringify, parse } from 'yaml'
import { localeMappings } from '@/util/localeMappings'

async function scan() {
  const files = await readdir('./src/views')
  const all = await Promise.all(files.map(async f => {
    const content = await readFile(join('./src/views', f), 'utf-8')
    const messages = squeeze('.', [{ content, path: './' + f }])
    for (const key of Object.keys(messages.components)) {
      const msgs = messages.components[key]
      for (const msg of msgs) {
        for (const [lang, content] of Object.entries(msg.messages)) {
          msg.messages[lang] = {}
        }
      }
    }
    const result = infuse('.', [{ content, path: './' + f }], messages)
    await writeFile(join('./src/views', f), result[0].content)
    return {
      content,
      path: './' + f,
    }
  }))

  // const result = squeeze('.', all)
  // const array = Object.entries(result.components).filter(r => r[1].length !== 0)

  // const localeToMessage: Record<string, any> = {}
  // for (const file of array) {
  //   const fileName = file[0]
  //   for (const block of file[1]) {
  //     const message = block.messages[block.locale!]
  //     if (!localeToMessage[block.locale!]) {
  //       localeToMessage[block.locale!] = {}
  //     }
  //     localeToMessage[block.locale!][fileName] = message
  //   }
  // }

  // for (const [local, file] of Object.entries(localeToMessage)) {
  //   try {
  //     const content = parse(await readFile(`./locales/${local}.yaml`, 'utf-8'))
  //     for (const k of Object.keys(file)) {
  //       const additional = file[k]
  //       const target = content[k]
  //       for (const ck of Object.keys(additional)) {
  //         const nested = additional[ck]
  //         if (typeof nested === 'object') {
  //           if (content[ck]) {
  //             Object.assign(content[ck], nested)
  //           } else {
  //             content[ck] = nested
  //           }
  //         } else {
  //           content[k.substring(2)] = additional
  //         }
  //       }
  //     }
  //     await writeFile(`./locales/${local}.yaml`, stringify(content, null, 2))
  //   } catch (e) {
  //     console.log(e)
  //   }
  // }
  // await writeFile('./dump.json', JSON.stringify(localeToMessage, undefined, 2))
}

scan()
