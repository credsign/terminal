import React from 'react';
import { Link } from 'react-router-dom';
import { getContentProps, getContentPosts, parseHeaders, humanizeDuration, getContentSlug, getRandom } from '../scripts/formatting.js';

class Feed extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      contents: [],
      contentProps: [],
      channelSize: 0,
      loading: true,
      token: props.match.params.token,
      pageLimit: 5,
      sort: props.match.params.sort || 'top'
    };

    this.loadContents = this.loadContents.bind(this);
    this.loadMore = this.loadMore.bind(this);
  }

  loadContents(sort) {
    let cacheBust = getRandom();
    window.read.getChannelSize(0, cacheBust, (error, size) => {
      size = size.toNumber();
      if (size == 0) {
        this.setState({
          contents: [],
          contentProps: [],
          channelSize: 0,
          loading: false
        });
        return;
      }
      window.read.getChannelFeed(0, 0, size, cacheBust, (error, contentIDs) => {
        // Load props for posts in channel
        getContentProps(contentIDs, (error, contentProps) => {
          if (sort == 'new') {
            contentProps = contentProps.reverse();
          }
          else if (sort == 'top') {
            contentProps = contentProps.sort((a, b) => a.score > b.score ? -1 : 1);
          }
          let ids = contentProps.slice(0, this.state.pageLimit).map(props => props.contentID);
          let blocks = contentProps.slice(0, this.state.pageLimit).map(props => props.block);
          getContentPosts(ids, blocks, (error, contentPosts) => {
            let contents = contentPosts.map((post, i) => {
              let props = contentProps[i];
              return {
                contentID: props.contentID,
                publisher: post.publisher,
                title: parseHeaders(post.headers).title,
                funds: props.funds,
                timestamp: post.timestamp * 1000,
                replyCount: props.replyCount
              }
            });
            this.setState({
              contents: contents,
              contentProps: contentProps,
              channelSize: size,
              loading: false
            });
          });
        });
      });
    });
  }

  loadMore() {
    this.setState({
      loading: true
    });
    let contentProps = this.state.contentProps;
    let newCount = this.state.contents.length + this.state.pageLimit;
    if (newCount > contentProps.length) {
      // TODO: this should be dependent on the channelsize,
      // and contingently load more contentProps in the future
      // instead of loading all the contentProps at the start
      newCount = contentProps.length;
    }
    let ids = contentProps.slice(0, newCount).map(props => props.contentID);
    let blocks = contentProps.slice(0, newCount).map(props => props.block);
    getContentPosts(ids, blocks, (error, contentPosts) => {
      let contents = contentPosts.map((post, i) => {
        let props = contentProps[i];
        return {
          contentID: props.contentID,
          publisher: post.publisher,
          title: parseHeaders(post.headers).title,
          funds: props.funds,
          timestamp: post.timestamp * 1000,
          replyCount: props.replyCount
        }
      });
      this.setState({
        contents: contents,
        loading: false
      });
    });
  }

  componentDidMount() {
    this.loadContents(this.state.sort);
  }

  componentWillReceiveProps(nextProps) {
    let sort = nextProps.match.params.sort;
    if (this.state.sort != sort) {
      if (sort == 'top' || sort == 'new') {
        this.setState({
          sort: sort
        });
        this.loadContents(sort);
      }
    }
  }

  render() {
    var now = new Date().getTime();
    var listItems = this.state.contents.map((content) => {
      return (
        <li key={'li-'+content.contentID}>
          <a href={`#/eth/${getContentSlug(content.title)}-${content.contentID}`}>
            <div>{`${content.title}`}</div>
            <span>{`${content.funds} ETH`}</span>
            <span>{` - ${content.replyCount} response${content.replyCount == 1 ? '' : 's'}`}</span>
            <span>{` - ${humanizeDuration(content.timestamp, now)} ago`}</span>
          </a>
        </li>
      );
    });

    return (
      <div style={{width:'100%'}} className='feed flex-grow'>
        <div style={{maxWidth: '600px', margin: '0 auto'}}>
          <div style={{padding: '1em'}}>
            <Link to={`/${this.state.token}/all/top`} style={{textDecoration: this.state.sort == 'top' ? 'none' : 'underline'}}>Top</Link>
            <span> - </span>
            <Link to={`/${this.state.token}/all/new`} style={{textDecoration: this.state.sort == 'new' ? 'none' : 'underline'}}>New</Link>
          </div>
          <div style={{
            margin: '1em',
            display: !this.state.loading && this.state.channelSize == 0 ? 'block'  : 'none'
          }}>Nothing found</div>
          <ol>{listItems}</ol>
          <div style={{
            fontStyle: 'italic',
            margin: '1em',
            display: this.state.loading ? 'block'  : 'none'
          }}>Loading...</div>
          <div style={{
            margin: '1em',
            display: !this.state.loading && this.state.channelSize != listItems.length ? 'block'  : 'none'
          }}><a style={{textDecoration: 'underline'}} onClick={this.loadMore}>Load more</a></div>
        </div>
        <div style={{height: '3em'}}>&nbsp;</div>
      </div>
    );
  }
}

export default Feed;