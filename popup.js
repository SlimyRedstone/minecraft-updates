const jsonURL = new URL('https://launchercontent.mojang.com/javaPatchNotes.json')
const nLastVersion = 3

var lastJSON = { versions: {} }

DocumentFragment.prototype.setAllElementsAttribute = function (name, value) {
	const e = this.querySelectorAll(`div[${name}]`)
	e.forEach((l, i) => {
		l?.setAttribute(name, value)
	})
	return e.length !== null
}

window.onload = () => {
	fetch(jsonURL)
		.then((r) => {
			return r.json()
		})
		.then((data) => {
			if (data.hasOwnProperty('entries')) {
				const versions = data['entries']
				// lastJSON['versions'] = versions

				if (versions.length >= nLastVersion) {
					versions.forEach((update, i) => {
						const keyName = update['version']
						lastJSON['versions'][keyName] = update
						if (i >= nLastVersion) return
						// console.log(`Version: ${update['version']} → %O`, update)

						const upElement = document.querySelector('template[name="update"]').content.cloneNode(true)
						const updatePictureURL = new URL(update['image']['url'], jsonURL.origin)

						upElement.setAllElementsAttribute('data-version', update['version'])
						upElement.setAllElementsAttribute('data-type', update['type'])
						upElement.setAllElementsAttribute('version-id', update['id'])

						upElement.querySelector('div[data-name="title"]').innerText = update['title']
						upElement.querySelector('div[data-name="body"]').innerHTML = update['body']
						upElement.querySelectorAll('div[data-name="image"]').forEach((_e, _i) => {
							_e.style.backgroundImage = `url(${updatePictureURL.href})`
						})

						document.querySelector('div#main').appendChild(upElement)
					})
				}
			}
		})
		.finally((r) => {
			document.querySelector('div[button="close"]').addEventListener('click', (event) => {
				document.querySelector('div#selected').setAttribute('state', 'close')
				document.querySelector('div#main').setAttribute('state', 'open')
				console.log('Version closed')
			})

			document.querySelectorAll('div#main div.update').forEach((update, index) => {
				update.addEventListener('click', (event) => {
					const target = event.target
					document.querySelector('div#selected').setAttribute('state', 'open')
					document.querySelector('div#main').setAttribute('state', 'close')
					const versionNum = update.getAttribute('data-version')
					
					if (Object.keys(lastJSON['versions']).includes(versionNum)) {
						console.log(`%O: Version opened → ${versionNum}`, update)
						document.querySelector('div#selected div#body').innerHTML = lastJSON['versions'][versionNum]['body']
					}
				})
			})
		})
}
