
module.exports = function(pg) {

  pg.Client.prototype.queryTmpl = function(obj, substVals) {

    /* lodash template handling
     *   since template strings do not allow templates-within-templates
     *   and a shortcut way to just inject blocks of sql that is trusted (i.e. not input from ajax call)
     */
    if (substVals) {
      var numSubstTries = 0;
      while (numSubstTries < 5 && obj.query.match(/{{/)) {
        _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
        var compiled = _.template(obj.query);
        obj.query = compiled(substVals);
        numSubstTries++;
      }
    }

    var me = this;
    var queryWrapper = new Promise(function(resolve, reject) {
      pg.Client.prototype.queryAsync.call(me, obj.query, obj.values)
        .then(function(queryResult) {
          queryResult = _.pick(queryResult, ['rowCount', 'rows']);
          resolve(queryResult);
        })
        .catch(function(e) {
          reject(e);
        });
    });

    return queryWrapper;
  };

  exports.sqlTemplate = pg.Client.prototype.sqlTmpl = function(pieces) {
    var result = '';
    var vals = [];
    var substitutions = [].slice.call(arguments, 1);
    for (var i = 0; i < substitutions.length; ++i) {
      result += pieces[i] + '$' + (i + 1);
      vals.push(substitutions[i]);
    }

    result += pieces[substitutions.length];

    return {query: result, values: vals};
  };

  return exports;
}

