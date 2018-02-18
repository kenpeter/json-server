module.exports = {
  getPage
}

// 
function getPage(array, page, perPage) {
  //
  var obj = {}
  // page is index, start page
  var start = (page - 1) * perPage
  // final page
  var end = page * perPage

  // get items
  obj.items = array.slice(start, end)
  // how many items
  if (obj.items.length === 0) {
    return obj
  }

  // prev page guard
  if (page > 1) {
    obj.prev = page - 1
  }

  // end page guard
  if (end < array.length) {
    obj.next = page + 1
  }

  // pass in items num !== sliced num, do with obj
  if (obj.items.length !== array.length) {
    obj.current = page
    obj.first = 1
    obj.last = Math.ceil(array.length / perPage)
  }

  return obj
}
