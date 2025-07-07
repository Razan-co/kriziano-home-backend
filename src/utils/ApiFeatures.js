class ApiFeatures {
  constructor(query, queryStr) {
    this.query = query
    this.queryStr = queryStr
  }

  search() {
    if (this.queryStr.search) {
      const keyword = {
        name: {
          $regex: this.queryStr.search,
          $options: 'i'
        }
      }
      this.query = this.query.find(keyword)
    }
    return this
  }

  filter() {
    const queryCopy = { ...this.queryStr }

    // Remove fields from query string for special purposes
    const excludeFields = ['search', 'page', 'limit', 'sort']
    excludeFields.forEach(field => delete queryCopy[field])

    // Advanced filtering: gte, lte, gt, lt
    let queryStr = JSON.stringify(queryCopy)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`)

    this.query = this.query.find(JSON.parse(queryStr))
    return this
  }

  filterByRating() {
    if (this.queryStr.rating) {
      const rating = parseFloat(this.queryStr.rating)
      this.query = this.query.find({
        averageRating: { $lte: rating }
      }).sort({ averageRating: -1 })
    }
    return this
  }

  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(',').join(' ')
      this.query = this.query.sort(sortBy)
    } else {
      this.query = this.query.sort('-createdAt') // Default: newest first
    }
    return this
  }

  paginate(resultPerPage) {
    const currentPage = Number(this.queryStr.page) || 1
    const skip = resultPerPage * (currentPage - 1)
    this.query = this.query.skip(skip).limit(resultPerPage)
    return this
  }
}

module.exports = ApiFeatures
