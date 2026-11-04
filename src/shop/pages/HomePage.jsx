import useTitle from '../useTitle';
import AfsanaSignatureHome from '../AfsanaSignatureHome';
import { useCmsPageCopy } from '../cmsCopy';

export default function HomePage(){
  const copy = useCmsPageCopy('home');
  useTitle(copy.browserTitle);
  return <div data-afsana-home><AfsanaSignatureHome/></div>;
}
