const mcAlarm = {
	name: 'mcUpdate',
	params: {
		delayInMinutes: 1, // Delay after which it will trigger, when activated
		periodInMinutes: 10 // Trigger period
	}
}
const mcNotifTemplate = {
	name: 'Minecraft Update',
	id: 'mcUpdateNotification',
	options: {
		title: 'New Minecraft Update !',
		message: 'Minecraft version',
		iconUrl: 'icons/128.png',
		priority: 2,
		silent: false,
		type: 'basic',
		buttons: [{ title: 'See more' }, { title: 'Close' }]
	}
}
const debugNotification = false
const forceUpdateAlarm = false
const jsonURL = new URL('https://launchercontent.mojang.com/javaPatchNotes.json')

var mcJSON = { raw: {}, versions: {}, n_versions: 0, lastUpdateID: 'unknown' }

function getUpdateURL(version = 'Minecraft 1.20.3 Pre-Release 1') {
	const url = new URL('https://www.minecraft.net')
	const cleanVersion = version.toLowerCase().replaceAll(' ', '-').replaceAll('.', '-')
	url.pathname = `/en-us/article/${cleanVersion}`
	return url
}

async function prepareNotif() {
	var notif = mcNotifTemplate
	notif['trigger'] = false
	await fetch(jsonURL)
		.then((r) => {
			return r.json()
		})
		.then((json) => {
			if (json.hasOwnProperty('entries')) {
				const versions = json['entries']
				const lastUpdate = versions[0]

				chrome.storage.local.get(['mc']).then(r=>{
					const storedJSON = r['mc']
					if (storedJSON['lastUpdateID'] != lastUpdate['id']) {
						mcJSON = storedJSON
						mcJSON['n_versions'] = versions.length
						mcJSON['raw'] = json
						mcJSON['lastUpdateID'] = lastUpdate['id']
						mcJSON['versions'] = {}
						console.log(mcJSON)

						versions.forEach((version, index) => {
							mcJSON['versions'][version['version']] = version
						})

						const updatePictureURL = new URL(lastUpdate['image']['url'], jsonURL.origin)

						notif['options']['message'] = lastUpdate['title']
						notif['options']['title'] = lastUpdate['type'] == 'snapshot' ? 'New Minecraft Snapshot !' : 'New Minecraft Update !'
						notif['options']['iconUrl'] = updatePictureURL.href
						notif['trigger'] = true
						chrome.storage.local.set({ mc: mcJSON })
					}
				})
			}
		})
	return Promise.resolve(notif)
}

async function postNotif(notif) {
	await chrome.notifications.clear(notif['id']).then((wasCleared) => {
		if (wasCleared) console.log(`'${mcNotifTemplate['name']}' notification successfully cleared !`)
		if (notif['trigger']==true) chrome.notifications.create(notif['id'], notif['options']).then((notifID) => {
			if (notifID == mcNotifTemplate.id) console.log(`'${mcNotifTemplate['name']}' notification displayed !`)
			return Promise.resolve(true)
		})
	})
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
	const realReason = reason == 'install' ? 'installed' : 'updated'
	console.log(`App ${realReason} !`)

	chrome.storage.local.get(['mc']).then((json) => {
		if (Object.keys(json).length != 0) {
			console.log(`Retrieving locally stored data → %O`, json)
			mcJSON = json['mc']['mcJSON']
		} else {
			console.log('Local data is empty, maybe first initialisation')
		}
	})

	if (forceUpdateAlarm) {
		chrome.alarms.clear(mcAlarm.name).then((wasCleared) => {
			if (wasCleared)
				chrome.alarms.create(mcAlarm.name, mcAlarm.params).then(() => {
					console.log(`Successfully installed alarm '${mcAlarm.name}', will be triggered every ${mcAlarm.params.periodInMinutes} minutes`)
				})
		})
	}

	if (reason == 'install') {
		chrome.alarms.getAll(function (list) {
			var alarmPresent = false
			if (!forceUpdateAlarm) {
				if (list.length != 0) {
					for (const alarm of list) {
						if (alarm.name == mcAlarm.name) {
							console.log(`Skipping creation of alarm ${mcAlarm.name} because it already exists`)
							alarmPresent = true
							break
						}
					}
				}
			}

			if (!alarmPresent) {
				console.log(`Creating alarm ${mcAlarm.name} because it does not exist`)
				chrome.alarms.create(mcAlarm.name, mcAlarm.params)
			}
		})
		chrome.notifications.create('mcUpdateNotification_Installation', {
			title: 'Minecraft Update Extension',
			message: 'The extension is now enabled, it will check every 10 minutes for new versions !',
			iconUrl: 'icons/128.png',
			priority: 1,
			silent: false,
			type: 'basic'
		})
	}
	if (debugNotification && reason == 'update') {
		prepareNotif().then(postNotif)
	}
})

chrome.alarms.onAlarm.addListener((alarm) => {
	console.log(`${alarm.name} fired !`)
	if (alarm.name == mcAlarm.name) prepareNotif().then(postNotif)
})

chrome.notifications.onButtonClicked.addListener((notifID, buttonID) => {
	if (notifID == mcNotifTemplate.id) {
		if (buttonID == 0) {
			const lastVersion = mcJSON['raw']['entries'][0]
			if (lastVersion['type'] == 'release') return
			const pageURL = getUpdateURL(lastVersion['title'])
			chrome.tabs.create({
				url: pageURL.href
			})
			console.log(`Opening new tab linking to the latest Minecraft version → ${lastVersion['version']}`)
		}
	}
})
