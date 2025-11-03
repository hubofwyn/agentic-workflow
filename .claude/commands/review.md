# Code Review Command

Perform a comprehensive code review of the current changes or specified files.

## Review Checklist

### Code Quality
- [ ] Code follows established patterns and conventions
- [ ] No code duplication (DRY principle)
- [ ] Functions are single-purpose and well-named
- [ ] Comments explain "why" not "what"
- [ ] No commented-out code

### Performance
- [ ] No unnecessary loops or iterations
- [ ] Efficient data structures used
- [ ] Database queries optimized
- [ ] Caching implemented where appropriate
- [ ] No memory leaks

### Security
- [ ] Input validation implemented
- [ ] No hardcoded secrets or credentials
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Proper authentication and authorization

### Testing
- [ ] Unit tests cover critical paths
- [ ] Integration tests for API endpoints
- [ ] Edge cases handled
- [ ] Error scenarios tested
- [ ] Test coverage meets requirements

### Documentation
- [ ] API documentation updated
- [ ] README reflects changes
- [ ] Inline documentation for complex logic
- [ ] Breaking changes documented
- [ ] Migration guide if needed

### Observability
- [ ] Proper logging implemented
- [ ] Metrics collection added
- [ ] Error handling with context
- [ ] Tracing spans created
- [ ] Alerts configured

## Review Process

1. **Analyze changes**: Understand the scope and purpose
2. **Check patterns**: Ensure consistency with codebase
3. **Verify tests**: Run and review test coverage
4. **Security scan**: Check for vulnerabilities
5. **Performance check**: Profile if needed
6. **Documentation**: Ensure completeness
7. **Provide feedback**: Constructive suggestions

## Output Format

```markdown
## Code Review Summary

### ✅ Strengths
- [List positive aspects]

### ⚠️ Suggestions
- [List improvements]

### 🚨 Issues
- [List critical problems]

### 📊 Metrics
- Coverage: X%
- Complexity: X
- Performance: Xms

### 🔄 Recommended Actions
1. [Specific action items]
```

Execute review now with thorough analysis of all aspects.